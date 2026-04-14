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
import { useQuery } from '@kbn/react-query';

import { agentStatusesToSummary } from '../../../../../../../common/services';

import type { AgentPolicy } from '../../../../types';
import {
  useGetAgentPolicies,
  sendGetAgentStatus,
  useUrlParams,
  useStartServices,
  sendGetAgentPolicies,
  useAuthz,
  sendGetActionStatus,
  sendGetAgentsForRq,
  sendGetAgentTagsForRq,
  sendBulkGetAgentPoliciesForRq,
  useAgentlessResources,
} from '../../../../hooks';
import { AgentStatusKueryHelper } from '../../../../services';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../constants';

import { getKuery } from '../utils/get_kuery';

import { removeVersionSuffixFromPolicyId } from '../../../../../../../common/services/version_specific_policies_utils';

import { useSessionAgentListState, defaultAgentListState } from './use_session_agent_list_state';

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
        const bulkGetAgentPoliciesResponse = await sendBulkGetAgentPoliciesForRq(
          policiesToFetchIds,
          {
            full: authz.fleet.readAgentPolicies,
            ignoreMissing: true,
          }
        );

        bulkGetAgentPoliciesResponse.items.forEach((agentPolicy) => {
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
  const { showAgentless } = useAgentlessResources();
  const defaultKuery: string = (urlParams.kuery as string) || '';
  const urlHasInactive = (urlParams.showInactive as string) === 'true';
  const isUsingParams = defaultKuery || urlHasInactive;

  // Extract state from session storage hook
  const sessionState = useSessionAgentListState();
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

  // If URL params are used, reset the table state to defaults with the param options
  useEffect(() => {
    if (isUsingParams) {
      updateTableState({
        ...defaultAgentListState,
        search: defaultKuery,
        selectedStatus: [...new Set([...selectedStatus, ...(urlHasInactive ? ['inactive'] : [])])],
      });
    }
    // Empty array so that this only runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL kuery param with session storage search to maintain shareable state
  useEffect(() => {
    const currentUrlKuery = (urlParams.kuery as string) || '';
    // If search is empty and URL has kuery, or search differs from URL, update URL
    if ((search === '' && currentUrlKuery !== '') || (search && search !== currentUrlKuery)) {
      const { kuery: _, ...restParams } = urlParams;
      const newParams = search === '' ? restParams : { ...restParams, kuery: search };
      history.replace({
        search: toUrlParams(newParams),
      });
    }
  }, [search, urlParams, history, toUrlParams]);

  // Flag to indicate if filters differ from default state
  const isUsingFilter = useMemo(() => {
    return (
      search !== defaultAgentListState.search ||
      !isEqual(selectedAgentPolicies, defaultAgentListState.selectedAgentPolicies) ||
      !isEqual(selectedStatus, defaultAgentListState.selectedStatus) ||
      !isEqual(selectedTags, defaultAgentListState.selectedTags) ||
      showUpgradeable !== defaultAgentListState.showUpgradeable
    );
  }, [search, selectedAgentPolicies, selectedStatus, selectedTags, showUpgradeable]);

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
        const { kuery: _, ...restParams } = urlParams;
        const newParams = newVal === '' ? restParams : { ...restParams, kuery: newVal };
        history.replace({
          search: toUrlParams(newParams),
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

  const [allTags, setAllTags] = useState<string[]>();
  const [latestAgentActionErrors, setLatestAgentActionErrors] = useState<string[]>([]);

  const { data: actionErrors } = useQuery({
    refetchInterval: REFRESH_INTERVAL_MS,
    queryKey: ['get-action-statuses'],
    initialData: [] as string[],
    queryFn: async () => {
      const actionStatusResponse = await sendGetActionStatus({
        latest: REFRESH_INTERVAL_MS + 5000, // avoid losing errors
        perPage: MAX_AGENT_ACTIONS,
      });

      return (
        actionStatusResponse.data?.items
          .filter((action) => action.latestErrors?.length ?? 0 > 1)
          .map((action) => action.actionId) || []
      );
    },
  });

  useEffect(() => {
    const allRecentActionErrors = [...new Set([...latestAgentActionErrors, ...actionErrors])];
    if (!isEqual(latestAgentActionErrors, allRecentActionErrors)) {
      setLatestAgentActionErrors(allRecentActionErrors);
    }
  }, [latestAgentActionErrors, actionErrors]);

  // Use session storage state for pagination and sort
  const queryKeyPagination = JSON.stringify({
    pagination: { currentPage: page.index + 1, pageSize: page.size },
    sortField: sort.field,
    sortOrder: sort.direction,
  });
  const queryKeyFilters = JSON.stringify({
    kuery,
    showAgentless,
    showInactive,
    showUpgradeable,
    search,
    selectedTags,
    selectedStatus,
  });

  const {
    isInitialLoading,
    isFetching: isLoading,
    data,
    refetch,
  } = useQuery({
    queryKey: ['get-agents-list', queryKeyFilters, queryKeyPagination],
    keepPreviousData: true, // Keep previous data to avoid flashing when going through pages
    queryFn: async () => {
      try {
        const [
          agentsResponse,
          totalInactiveAgentsResponse,
          managedAgentPoliciesResponse,
          agentTagsResponse,
        ] = await Promise.all([
          sendGetAgentsForRq({
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
          sendGetAgentTagsForRq({
            showInactive,
          }),
        ]);

        if (!totalInactiveAgentsResponse.data) {
          throw new Error('Invalid GET /agents_status response');
        }
        if (managedAgentPoliciesResponse.error) {
          throw new Error(managedAgentPoliciesResponse.error.message);
        }

        const statusSummary = agentsResponse.statusSummary;

        if (!statusSummary) {
          throw new Error('Invalid GET /agents response - no status summary');
        }
        // Fetch agent policies, use a local cache
        const policyIds = agentsResponse.items.map((agent) =>
          removeVersionSuffixFromPolicyId(agent?.policy_id!)
        );
        const policies = await fullAgentPolicyFecher.fetchPolicies(policyIds);

        const agentPoliciesIndexedById = policies.reduce((acc, agentPolicy) => {
          acc[agentPolicy.id] = agentPolicy;

          return acc;
        }, {} as { [k: string]: AgentPolicy });
        const agentsStatus = agentStatusesToSummary(statusSummary);

        const newAllTags = [...agentTagsResponse.items];

        const agentsOnCurrentPage = agentsResponse.items;
        const nAgentsInTable = agentsResponse.total;
        const totalInactiveAgents = totalInactiveAgentsResponse.data.results.inactive || 0;

        const managedAgentPolicies = managedAgentPoliciesResponse.data?.items ?? [];

        let totalManagedAgentIds: string[] = [];
        let managedAgentsOnCurrentPage = 0;
        if (managedAgentPolicies.length !== 0) {
          // Find all the agents that have managed policies
          // to the correct ids we need to build the kuery applying the same filters as the global ones
          const managedPoliciesKuery = getKuery({
            search,
            selectedAgentPolicies: managedAgentPolicies.map((policy) => policy.id),
            selectedTags,
            selectedStatus,
          });
          const response = await sendGetAgentsForRq({
            kuery: `${managedPoliciesKuery}`,
            perPage: SO_SEARCH_LIMIT,
            showInactive,
          });

          const allManagedAgents = response?.items ?? [];
          const allManagedAgentIds = allManagedAgents?.map((agent) => agent.id);
          totalManagedAgentIds = allManagedAgentIds;
          managedAgentsOnCurrentPage = agentsResponse.items
            .map((agent) => agent.id)
            .filter((agentId) => allManagedAgentIds.includes(agentId)).length;
        }

        return {
          agentPoliciesIndexedById,
          agentsStatus,
          agentsOnCurrentPage,
          nAgentsInTable,
          totalInactiveAgents,
          newAllTags,
          totalManagedAgentIds,
          managedAgentsOnCurrentPage,
          queryKeyFilters,
        };
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.agentList.errorFetchingDataTitle', {
            defaultMessage: 'Error fetching agents',
          }),
        });
        throw error;
      }
    },
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const agentsStatus = data?.agentsStatus;
  const agentsOnCurrentPage = useMemo(() => data?.agentsOnCurrentPage || [], [data]);
  const nAgentsInTable = data?.nAgentsInTable || 0;
  const totalInactiveAgents = data?.totalInactiveAgents || 0;
  const agentPoliciesIndexedById = data?.agentPoliciesIndexedById || {};
  const totalManagedAgentIds = data?.totalManagedAgentIds || [];
  const managedAgentsOnCurrentPage = data?.managedAgentsOnCurrentPage || 0;

  const newAllTags = useMemo(() => data?.newAllTags || [], [data]);
  useEffect(() => {
    if (!isEqual(newAllTags, allTags)) {
      setAllTags(newAllTags);
    }
  }, [newAllTags, allTags]);

  const fetchData = useCallback(
    async ({ refreshTags = false }: { refreshTags?: boolean } = {}) => {
      return refetch();
    },
    [refetch]
  );

  const queryHasChanged = useMemo(() => {
    return !isEqual(queryKeyFilters, data?.queryKeyFilters);
  }, [queryKeyFilters, data?.queryKeyFilters]);

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
    isInitialLoading,
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
    queryHasChanged,
    latestAgentActionErrors,
    setLatestAgentActionErrors,
    isUsingFilter,
    clearFilters: sessionState.clearFilters,
    onTableChange: sessionState.onTableChange,
  };
}
