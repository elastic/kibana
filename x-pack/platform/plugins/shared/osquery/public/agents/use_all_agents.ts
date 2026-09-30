/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { escapeKuery } from '@kbn/es-query';

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
    // osqueryPolicies kept in queryKey so the picker refetches if the set of osquery policies changes
    queryKey: ['agents', osqueryPolicies, searchValue, perPage, agentIds],
    queryFn: () => {
      // Policy-id scoping is enforced server-side; sending the ids here overflowed the 16 KB
      // request header at ~175 policies (#266739). Escaping is not cosmetic: an unescaped
      // `)` + `or` can lift clauses out of the server's policy scope.
      const escapedSearch = escapeKuery(searchValue);
      const kuery = searchValue
        ? `local_metadata.host.hostname.keyword:*${escapedSearch}* or local_metadata.elastic.agent.id:*${escapedSearch}* or policy_id: *${escapedSearch}* or local_metadata.os.platform: *${escapedSearch}* or policy_name:${escapedSearch}`
        : '';

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
