/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { API_VERSIONS } from '../../common/constants';
import { useErrorToast } from '../common/hooks/use_error_toast';

const AGENT_DETAILS_CACHE_TIME_MS = 30000;
const BULK_AGENT_DETAILS_ROUTE = '/internal/osquery/fleet_wrapper/agents/_bulk';

interface AgentDetails {
  id: string;
  local_metadata?: { host?: { name?: string } };
}

interface BulkAgentDetailsResponse {
  agents: AgentDetails[];
}

/**
 * Fetches agent details in bulk for the given agent IDs and returns
 * a map of agentId → display name (hostname or agentId fallback).
 */
export const useBulkAgentDetails = (agentIds: string[]) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  const stableKey = useMemo(() => [...agentIds].sort().join(','), [agentIds]);

  const { data: agentsData } = useQuery(
    ['bulkAgentDetails', stableKey],
    async () => {
      if (agentIds.length === 0) return { agents: [] };

      return http.post<BulkAgentDetailsResponse>(BULK_AGENT_DETAILS_ROUTE, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ agentIds }),
      });
    },
    {
      enabled: agentIds.length > 0,
      staleTime: AGENT_DETAILS_CACHE_TIME_MS,
      onError: (err) => {
        setErrorToast(err, {
          title: i18n.translate('xpack.osquery.bulkAgentDetails.fetchError', {
            defaultMessage: 'Error fetching agent details',
          }),
          toastMessage: i18n.translate('xpack.osquery.bulkAgentDetails.fetchErrorMessage', {
            defaultMessage:
              'Failed to load agent names. Please check your network connection and try again.',
          }),
        });
      },
    }
  );

  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    agentsData?.agents?.forEach((agent) => {
      const hostname = agent.local_metadata?.host?.name || agent.id;
      map.set(agent.id, hostname);
    });

    return map;
  }, [agentsData]);

  return { agentNameMap };
};
