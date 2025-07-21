/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { useHistory } from 'react-router-dom';

import { agentStatusesToSummary } from '../../../../../../../common/services';

import type { Agent, AgentPolicy, SimplifiedAgentStatus } from '../../../../types';
import {
  useGetAgentPolicies,
  sendGetAgents,
  sendGetAgentStatus,
  useUrlParams,
  useStartServices,
  sendGetAgentTags,
  sendGetAgentPolicies,
  useAuthz,
  sendGetActionStatus,
  sendBulkGetAgentPolicies,
} from '../../../../hooks';
import { AgentStatusKueryHelper } from '../../../../services';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../constants';

import { getKuery } from '../utils/get_kuery';

import {
  useSessionAgentListState,
  getDefaultAgentListState,
  type AgentListTableState,
} from './use_session_agent_list_state';

const REFRESH_INTERVAL_MS = 30000;
const MAX_AGENT_ACTIONS = 100;
/** Allow to fetch full agent policy using a cache */
function useFullAgentPolicyFetcher() {
  const authz = useAuthz();
  const fetchedAgentPoliciesRef = useRef<{
    [k: string]: AgentPolicy;
  }>({});

  const fetchPolicies = useCallback(
    async (policiesIds: string[]) => {
      const policiesToFetchIds = policiesIds.reduce((acc, policyId) => {
        if (!fetchedAgentPoliciesRef.current[policyId]) {
          acc.push(policyId);
        }
        return acc;
      }, [] as string[]);

      if (policiesToFetchIds.length) {
        const bulkGetAgentPoliciesResponse = await sendBulkGetAgentPolicies(policiesToFetchIds, {
          full: authz.fleet.readAgentPolicies,
          ignoreMissing: true,
        });

        if (bulkGetAgentPoliciesResponse.error) {
          throw bulkGetAgentPoliciesResponse.error;
        }

        if (!bulkGetAgentPoliciesResponse.data) {
          throw new Error('Invalid bulk GET agent policies response');
        }
        bulkGetAgentPoliciesResponse.data.items.forEach((agentPolicy) => {
          fetchedAgentPoliciesRef.current[agentPolicy.id] = agentPolicy;
        });
      }

      return policiesIds.reduce((acc, policyId) => {
        if (fetchedAgentPoliciesRef.current[policyId]) {
          acc.push(fetchedAgentPoliciesRef.current[policyId]);
        }
        return acc;
      }, [] as AgentPolicy[]);
    },
    [authz.fleet.readAgentPolicies]
  );

  return useMemo(
    () => ({
      fetchPolicies,
    }),
    [fetchPolicies]
  );
}

const VERSION_FIELD = 'local_metadata.elastic.agent.version';
const HOSTNAME_FIELD = 'local_metadata.host.hostname';

export const getSortFieldForAPI = (field: string): string => {
  if ([VERSION_FIELD, HOSTNAME_FIELD].includes(field)) {
    return `${field}.keyword`;
  }
  return field;
};

export function useFetchAgentsData() {
  const fullAgentPolicyFecher = useFullAgentPolicyFetcher();

  const { notifications } = useStartServices();

  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();
  const showAgentless = urlParams.showAgentless === 'true';
  const defaultKuery: string = (urlParams.kuery as string) || '';
  const urlHasInactive = (urlParams.showInactive as string) === 'true';

  // Initialize default state for session storage
  const getInitialState = useCallback((): AgentListTableState => {
    const baseState = getDefaultAgentListState();
    return {
      ...baseState,
      search: defaultKuery,
      selectedStatus: [
        'healthy',
        'unhealthy',
        'orphaned',
        'updating',
        'offline',
        ...(urlHasInactive ? ['inactive'] : []),
      ],
    };
  }, [defaultKuery, urlHasInactive]);

  // Use session storage hook for table state
  const sessionState = useSessionAgentListState({
    defaultState: getInitialState(),
  });

  // Extract state from session storage hook
  const {
    search,
    selectedAgentPolicies,
    selectedStatus,
    selectedTags,
    showUpgradeable,
    sort,
    page,
    updateTableState,
  } = sessionState;

  // Create individual setters using updateTableState
  const setSearchState = useCallback(
    (value: string) => updateTableState({ search: value }),
    [updateTableState]
  );

  const setSelectedAgentPolicies = useCallback(
    (value: string[]) => updateTableState({ selectedAgentPolicies: value }),
    [updateTableState]
  );

  const setSelectedStatus = useCallback(
    (value: string[]) => updateTableState({ selectedStatus: value }),
    [updateTableState]
  );

  const setSelectedTags = useCallback(
    (value: string[]) => updateTableState({ selectedTags: value }),
    [updateTableState]
  );

  const setShowUpgradeable = useCallback(
    (value: boolean) => updateTableState({ showUpgradeable: value }),
    [updateTableState]
  );

  const pageSizeOptions = [5, 20, 50];

  // Sync draftKuery with session storage search
  const [draftKuery, setDraftKuery] = useState<string>(search);
  useEffect(() => {
    setDraftKuery(search);
  }, [search]);

  const showInactive = useMemo(() => {
    return selectedStatus.some((status) => status === 'inactive') || selectedStatus.length === 0;
  }, [selectedStatus]);

  const includeUnenrolled = useMemo(() => {
    return selectedStatus.some((status) => status === 'unenrolled') || selectedStatus.length === 0;
  }, [selectedStatus]);

  const setSearch = useCallback(
    (newVal: string) => {
      setSearchState(newVal);
      if (newVal.trim() === '' && !urlParams.kuery) {
        return;
      }

      if (urlParams.kuery !== newVal) {
        history.replace({
          // @ts-expect-error - kuery can't be undefined
          search: toUrlParams({ ...urlParams, kuery: newVal === '' ? undefined : newVal }),
        });
      }
    },
    [setSearchState, urlParams, history, toUrlParams]
  );

  // filters kuery
  let kuery = useMemo(() => {
    return getKuery({
      search,
      selectedAgentPolicies,
      selectedTags,
      selectedStatus,
    });
  }, [search, selectedAgentPolicies, selectedStatus, selectedTags]);

  kuery =
    includeUnenrolled && kuery ? `status:* AND (${kuery})` : includeUnenrolled ? `status:*` : kuery;

  const [agentsOnCurrentPage, setAgentsOnCurrentPage] = useState<Agent[]>([]);
  const [agentsStatus, setAgentsStatus] = useState<
    { [key in SimplifiedAgentStatus]: number } | undefined
  >();
  const [allTags, setAllTags] = useState<string[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [nAgentsInTable, setNAgentsInTable] = useState(0);
  const [totalInactiveAgents, setTotalInactiveAgents] = useState(0);
  const [totalManagedAgentIds, setTotalManagedAgentIds] = useState<string[]>([]);
  const [managedAgentsOnCurrentPage, setManagedAgentsOnCurrentPage] = useState(0);
  const [agentPoliciesIndexedById, setAgentPoliciesIndexedByIds] = useState<{
    [k: string]: AgentPolicy;
  }>({});

  const [latestAgentActionErrors, setLatestAgentActionErrors] = useState<string[]>([]);

  const isLoadingVar = useRef<boolean>(false);

  // Request to fetch agents and agent status
  const currentRequestRef = useRef<number>(0);
  const fetchData = useCallback(
    ({ refreshTags = false }: { refreshTags?: boolean } = {}) => {
      async function fetchDataAsync() {
        // skipping refresh if previous request is in progress
        if (isLoadingVar.current) {
          return;
        }
        currentRequestRef.current++;
        const currentRequest = currentRequestRef.current;
        isLoadingVar.current = true;

        try {
          setIsLoading(true);
          const [
            agentsResponse,
            totalInactiveAgentsResponse,
            managedAgentPoliciesResponse,
            agentTagsResponse,
            actionStatusResponse,
          ] = await Promise.all([
            sendGetAgents({
              page: page.index + 1,
              perPage: page.size,
              kuery: kuery && kuery !== '' ? kuery : undefined,
              sortField: getSortFieldForAPI(sort.field),
              sortOrder: sort.direction,
              showAgentless,
              showInactive,
              showUpgradeable,
              getStatusSummary: true,
              withMetrics: true,
            }),
            sendGetAgentStatus({
              kuery: AgentStatusKueryHelper.buildKueryForInactiveAgents(),
            }),
            sendGetAgentPolicies({
              kuery: `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed:true`,
              perPage: SO_SEARCH_LIMIT,
              full: false,
            }),
            sendGetAgentTags({
              showInactive,
            }),
            sendGetActionStatus({
              latest: REFRESH_INTERVAL_MS + 5000, // avoid losing errors
              perPage: MAX_AGENT_ACTIONS,
            }),
          ]);
          // Return if a newer request has been triggered
          if (currentRequestRef.current !== currentRequest) {
            return;
          }
          if (agentsResponse.error) {
            throw agentsResponse.error;
          }
          if (!agentsResponse.data) {
            throw new Error('Invalid GET /agents response');
          }
          if (!totalInactiveAgentsResponse.data) {
            throw new Error('Invalid GET /agents_status response');
          }
          if (managedAgentPoliciesResponse.error) {
            throw new Error(managedAgentPoliciesResponse.error.message);
          }
          if (agentTagsResponse.error) {
            throw agentTagsResponse.error;
          }
          if (!agentTagsResponse.data) {
            throw new Error('Invalid GET /agent/tags response');
          }
          if (actionStatusResponse.error) {
            throw new Error('Invalid GET /agents/action_status response');
          }

          const statusSummary = agentsResponse.data.statusSummary;

          if (!statusSummary) {
            throw new Error('Invalid GET /agents response - no status summary');
          }
          // Fetch agent policies, use a local cache
          const policyIds = agentsResponse.data.items.map((agent) => agent.policy_id as string);

          const policies = await fullAgentPolicyFecher.fetchPolicies(policyIds);

          isLoadingVar.current = false;
          // Return if a newe request has been triggerd
          if (currentRequestRef.current !== currentRequest) {
            return;
          }

          setAgentPoliciesIndexedByIds(
            policies.reduce((acc, agentPolicy) => {
              acc[agentPolicy.id] = agentPolicy;

              return acc;
            }, {} as { [k: string]: AgentPolicy })
          );

          setAgentsStatus(agentStatusesToSummary(statusSummary));

          const newAllTags = [...agentTagsResponse.data.items];
          // We only want to update the list of available tags if
          // - We haven't set any tags yet
          // - We've received the "refreshTags" flag which will force a refresh of the tags list when an agent is unenrolled
          // - Tags are modified (add, remove, edit)
          if (!allTags || refreshTags || !isEqual(newAllTags, allTags)) {
            setAllTags(newAllTags);
          }

          setAgentsOnCurrentPage(agentsResponse.data.items);
          setNAgentsInTable(agentsResponse.data.total);
          setTotalInactiveAgents(totalInactiveAgentsResponse.data.results.inactive || 0);

          const managedAgentPolicies = managedAgentPoliciesResponse.data?.items ?? [];

          if (managedAgentPolicies.length === 0) {
            setTotalManagedAgentIds([]);
            setManagedAgentsOnCurrentPage(0);
          } else {
            // Find all the agents that have managed policies
            // to the correct ids we need to build the kuery applying the same filters as the global ones
            const managedPoliciesKuery = getKuery({
              search,
              selectedAgentPolicies: managedAgentPolicies.map((policy) => policy.id),
              selectedTags,
              selectedStatus,
            });
            const response = await sendGetAgents({
              kuery: `${managedPoliciesKuery}`,
              perPage: SO_SEARCH_LIMIT,
              showInactive,
            });
            if (response.error) {
              throw new Error(response.error.message);
            }
            const allManagedAgents = response.data?.items ?? [];
            const allManagedAgentIds = allManagedAgents?.map((agent) => agent.id);
            setTotalManagedAgentIds(allManagedAgentIds);

            setManagedAgentsOnCurrentPage(
              agentsResponse.data.items
                .map((agent) => agent.id)
                .filter((agentId) => allManagedAgentIds.includes(agentId)).length
            );
          }

          const actionErrors =
            actionStatusResponse.data?.items
              .filter((action) => action.latestErrors?.length ?? 0 > 1)
              .map((action) => action.actionId) || [];
          const allRecentActionErrors = [...new Set([...latestAgentActionErrors, ...actionErrors])];
          if (!isEqual(latestAgentActionErrors, allRecentActionErrors)) {
            setLatestAgentActionErrors(allRecentActionErrors);
          }
        } catch (error) {
          isLoadingVar.current = false;
          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.fleet.agentList.errorFetchingDataTitle', {
              defaultMessage: 'Error fetching agents',
            }),
          });
        }
        setIsLoading(false);
      }
      fetchDataAsync();
    },
    [
      kuery,
      page.index,
      page.size,
      sort.field,
      sort.direction,
      showAgentless,
      showInactive,
      showUpgradeable,
      fullAgentPolicyFecher,
      allTags,
      latestAgentActionErrors,
      search,
      selectedTags,
      selectedStatus,
      notifications.toasts,
    ]
  );

  // Send request to get agent list and status
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchData]);

  const agentPoliciesRequest = useGetAgentPolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  const allAgentPolicies = useMemo(
    () => agentPoliciesRequest.data?.items || [],
    [agentPoliciesRequest.data]
  );

  return {
    allTags,
    setAllTags,
    agentsOnCurrentPage,
    agentsStatus,
    isLoading,
    nAgentsInTable,
    totalInactiveAgents,
    totalManagedAgentIds,
    managedAgentsOnCurrentPage,
    showUpgradeable,
    setShowUpgradeable,
    search,
    setSearch,
    selectedAgentPolicies,
    setSelectedAgentPolicies,
    sort,
    selectedStatus,
    setSelectedStatus,
    selectedTags,
    setSelectedTags,
    allAgentPolicies,
    agentPoliciesRequest,
    agentPoliciesIndexedById,
    page,
    pageSizeOptions,
    kuery,
    draftKuery,
    setDraftKuery,
    fetchData,
    currentRequestRef,
    latestAgentActionErrors,
    setLatestAgentActionErrors,

    // Session storage utilities
    clearFilters: sessionState.clearFilters,
    resetToDefaults: sessionState.resetToDefaults,
    onTableChange: sessionState.onTableChange,
  };
}
