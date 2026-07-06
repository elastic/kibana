/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../hooks/use_kibana';

const RELAY_TENANTS_QUERY_KEY = ['streamsRelayTenants'] as const;

/** Whether the deployment has an active tenant for the given connector surface (e.g. `'slack'`). */
export const isSurfaceConnected = (
  tenants: Array<{ surface: string; status: string }>,
  surface: string
): boolean => tenants.some((tenant) => tenant.surface === surface && tenant.status === 'active');

/**
 * Lists the deployment's relay tenants (e.g. connected Slack workspaces) so
 * the Apps panel can show a connector as "Connected" instead of the Connect
 * button. Unlike a user-initiated action, this is a passive status check, so
 * a failed fetch (relay unconfigured, feature disabled, etc.) fails silently
 * and falls back to "no tenants" (Connect button shown) rather than an error
 * toast.
 */
export const useRelayTenants = () => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { data, isLoading, error } = useQuery({
    queryKey: RELAY_TENANTS_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch('GET /internal/streams/relay/tenants', {
        params: { query: {} },
        signal: signal ?? null,
      }),
  });

  return { tenants: data?.items ?? [], isLoading, error };
};
