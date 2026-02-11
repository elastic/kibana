/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';

import type { Agent } from '@kbn/fleet-plugin/common';
import type { processAggregations } from '../../common/utils/aggregations';
import { API_VERSIONS } from '../../common/constants';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useKibana } from '../common/lib/kibana';
import { useOsqueryPolicies } from './use_osquery_policies';

interface RequestOptions {
  perPage?: number;
  page?: number;
  agentIds?: string[];
}

// TODO: break out the paginated vs all cases into separate hooks
export const useAllAgents = (searchValue = '', opts: RequestOptions = { perPage: 9000 }) => {
  const { perPage, agentIds } = opts;
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  const { data: osqueryPolicies, isFetched } = useOsqueryPolicies();

  return useQuery<{
    agents: Agent[];
    groups: ReturnType<typeof processAggregations>;
    total: number;
  }>({
    queryKey: ['agents', osqueryPolicies, searchValue, perPage, agentIds],
    queryFn: () => {
      let kuery = '';

      if (osqueryPolicies?.length) {
        // Start with agents that have osquery policies
        kuery = `(${osqueryPolicies.map((p) => `policy_id:${p}`).join(' or ')})`;

        if (searchValue) {
          // When searching, restrict to osquery policy agents AND matching the search
          kuery += ` and (local_metadata.host.hostname.keyword:*${searchValue}* or local_metadata.elastic.agent.id:*${searchValue}* or policy_id: *${searchValue}* or local_metadata.os.platform: *${searchValue}* or policy_name:${searchValue} )`;
        }
        // Note: We don't filter by status:online here or agentIds anymore because:
        // 1. All agents with osquery policies should be shown in the dropdown
        // 2. Backend already filters 'NOT status:offline' to include degraded agents
        // 3. Pre-selected agents are tracked in UI state, not query filters
        // 4. Restricting by agentIds would hide other valid selectable agents
      }

      return http.get(`/internal/osquery/fleet_wrapper/agents`, {
        version: API_VERSIONS.internal.v1,
        query: {
          kuery,
          perPage,
        },
      });
    },
    enabled: isFetched && !!osqueryPolicies?.length,
    onSuccess: () => setErrorToast(),
    onError: (error) =>
      // @ts-expect-error update types
      setErrorToast(error?.body, {
        title: i18n.translate('xpack.osquery.agents.fetchError', {
          defaultMessage: 'Error while fetching agents',
        }),
        // @ts-expect-error update types
        toastMessage: error?.body?.error,
      }),
  });
};
