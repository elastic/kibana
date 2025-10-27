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

import type { Agent, AgentPolicy } from '../../../../types';
import {
  usePagination,
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

  // Table and search states
  const [showUpgradeable, setShowUpgradeable] = useState<boolean>(false);
  const [draftKuery, setDraftKuery] = useState<string>(defaultKuery);
  const [search, setSearchState] = useState<string>(defaultKuery);
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const [sortField, setSortField] = useState<keyof Agent>('enrolled_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Policies state for filtering
  const [selectedAgentPolicies, setSelectedAgentPolicies] = useState<string[]>([]);

  // Status for filtering
  const [selectedStatus, setSelectedStatus] = useState<string[]>([
    'healthy',
    'unhealthy',
    'orphaned',
    'updating',
    'offline',
    ...(urlHasInactive ? ['inactive'] : []),
  ]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
    [urlParams, history, toUrlParams]
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

  const queryKeyPagination = JSON.stringify({ pagination, sortField, sortOrder });
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
    keepPreviousData: true, // Keep previous data to avoid flashing when going through pages coulse
    queryFn: async () => {
      try {
        const [
          agentsResponse,
          totalInactiveAgentsResponse,
          managedAgentPoliciesResponse,
          agentTagsResponse,
        ] = await Promise.all([
          sendGetAgentsForRq({
            page: pagination.currentPage,
            perPage: pagination.pageSize,
            kuery: kuery && kuery !== '' ? kuery : undefined,
            sortField: getSortFieldForAPI(sortField),
            sortOrder,
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
        const policyIds = agentsResponse.items.map((agent) => agent.policy_id as string);

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
    if (newAllTags.length && !isEqual(newAllTags, allTags)) {
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
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    selectedStatus,
    setSelectedStatus,
    selectedTags,
    setSelectedTags,
    allAgentPolicies,
    agentPoliciesRequest,
    agentPoliciesIndexedById,
    pagination,
    pageSizeOptions,
    setPagination,
    kuery,
    draftKuery,
    setDraftKuery,
    fetchData,
    queryHasChanged,
    latestAgentActionErrors,
    setLatestAgentActionErrors,
  };
}
