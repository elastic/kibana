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
  const now = new Date().toISOString();
  const baseMeta = (id: string, host: string) => ({
    elastic: { agent: { id, version: '8.18.0', snapshot: false } },
    host: { hostname: host, name: host, id: `host-${id}`, architecture: 'arm64' },
    os: { family: 'darwin', platform: 'darwin', name: 'macOS', full: 'macOS 15.3' },
  });
  const MOCK_AGENTS = [
    {
      id: 'fake-agent-001',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-001', 'ip-172-31-42-197.us-west-2.compute.internal.prod.acme-corp.observability'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'prod-obs',
      policy_revision: 5,
      status: 'online' as const,
      packages: [],
      tags: ['production'],
      metrics: { cpu_avg: 0.35, memory_size_byte_avg: 537000000 },
    },
    {
      id: 'fake-agent-002',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-002', 'ip-10-0-15-83.eu-central-1.compute.internal.staging.acme-corp.platform'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'cloud-mgd',
      policy_revision: 3,
      status: 'online' as const,
      packages: [],
      tags: ['staging'],
      metrics: { cpu_avg: 1.02, memory_size_byte_avg: 224000000 },
    },
    {
      id: 'fake-agent-003',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-003', 'ip-192-168-1-50.ap-southeast-1.compute.internal.dev.acme-corp.monitoring'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'prod-obs#8.17',
      policy_revision: 5,
      status: 'online' as const,
      packages: [],
      tags: ['development'],
      metrics: { cpu_avg: 0.78, memory_size_byte_avg: 412000000 },
    },
    {
      id: 'fake-agent-004',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-004', 'ip-10-200-3-12.us-east-1.compute.internal.prod.acme-corp.logging'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'log-legacy',
      policy_revision: 2,
      status: 'online' as const,
      packages: [],
      tags: ['production', 'needs-update'],
      metrics: { cpu_avg: 2.61, memory_size_byte_avg: 301000000 },
    },
    {
      id: 'fake-agent-005',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-005', 'ip-172-16-88-201.us-west-1.compute.internal.prod.acme-corp.infra'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'cloud-mgd#8.16',
      policy_revision: 1,
      status: 'online' as const,
      packages: [],
      tags: ['infra'],
      metrics: { cpu_avg: 0.52, memory_size_byte_avg: 310000000 },
    },
    {
      id: 'fake-agent-006',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-006', 'ip-10-50-7-99.eu-west-1.compute.internal.prod.acme-corp.telemetry'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'cloud-mgd',
      policy_revision: 1,
      status: 'online' as const,
      packages: [],
      tags: ['telemetry'],
      metrics: { cpu_avg: 0.45, memory_size_byte_avg: 256000000 },
    },
    {
      id: 'fake-agent-007',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-007', 'ip-10-44-12-77.us-west-2.compute.internal.prod.acme-corp.security'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'cloud-mgd#8.17',
      policy_revision: 3,
      status: 'online' as const,
      packages: [],
      tags: ['security'],
      metrics: { cpu_avg: 0.67, memory_size_byte_avg: 290000000 },
    },
    {
      id: 'fake-agent-008',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-008', 'ip-10-88-5-33.eu-west-2.compute.internal.prod.acme-corp.edge'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'prod-obs#8.16',
      policy_revision: 2,
      status: 'online' as const,
      packages: [],
      tags: ['edge'],
      metrics: { cpu_avg: 1.45, memory_size_byte_avg: 350000000 },
    },
    {
      id: 'fake-agent-009',
      type: 'PERMANENT' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-009', 'ip-10-100-22-45.ca-central-1.compute.internal.prod.acme-corp.analytics'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'deleted-policy',
      policy_revision: 1,
      status: 'online' as const,
      packages: [],
      tags: [],
      metrics: { cpu_avg: 0.12, memory_size_byte_avg: 198000000 },
    },
    {
      id: 'fake-agent-010',
      type: 'OPAMP' as const,
      active: true,
      enrolled_at: now,
      local_metadata: baseMeta('fake-agent-010', 'ip-10-75-3-18.ap-northeast-1.compute.internal.prod.acme-corp.collector'),
      last_checkin: now,
      last_checkin_status: 'online' as const,
      policy_id: 'prod-obs',
      policy_revision: 5,
      status: 'online' as const,
      packages: [],
      tags: ['opamp'],
      metrics: { cpu_avg: 0.33, memory_size_byte_avg: 180000000 },
    },
  ];
  const MOCK_POLICIES: Record<string, AgentPolicy> = {
    'prod-obs': {
      id: 'prod-obs',
      name: 'Production Observability Platform Policy',
      namespace: 'default',
      status: 'active',
      is_managed: false,
      revision: 5,
      updated_at: now,
      updated_by: 'elastic',
      schema_version: '1.1.1',
      package_policies: [],
      is_protected: false,
      monitoring_enabled: ['logs', 'metrics'],
    } as unknown as AgentPolicy,
    'cloud-mgd': {
      id: 'cloud-mgd',
      name: 'Elastic Cloud Managed Agent Policy',
      namespace: 'default',
      status: 'active',
      is_managed: true,
      revision: 3,
      updated_at: now,
      updated_by: 'elastic',
      schema_version: '1.1.1',
      package_policies: [],
      is_protected: false,
      monitoring_enabled: ['logs', 'metrics'],
    } as unknown as AgentPolicy,
    'log-legacy': {
      id: 'log-legacy',
      name: 'Legacy Infrastructure Logging Policy',
      namespace: 'default',
      status: 'active',
      is_managed: false,
      revision: 7,
      updated_at: now,
      updated_by: 'elastic',
      schema_version: '1.1.1',
      package_policies: [],
      is_protected: false,
      monitoring_enabled: ['logs'],
    } as unknown as AgentPolicy,
  };
  const agentsOnCurrentPage = useMemo(
    () => (data?.agentsOnCurrentPage?.length ? data.agentsOnCurrentPage : MOCK_AGENTS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );
  const nAgentsInTable = data?.nAgentsInTable || agentsOnCurrentPage.length;
  const totalInactiveAgents = data?.totalInactiveAgents || 0;
  const realPolicies = data?.agentPoliciesIndexedById || {};
  const agentPoliciesIndexedById = Object.keys(realPolicies).length > 0
    ? realPolicies
    : MOCK_POLICIES;
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
