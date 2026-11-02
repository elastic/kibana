/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { sendListAgentlessPolicies } from '../../../../../hooks';
import type { RequestError } from '../../../../../hooks';

/**
 * Read agentless deployments through the agentless policies LIST API instead of the
 * package-policy LIST + bulk agent-policy reads. The server already scopes the result set to
 * agentless policies, so callers only pass a package-name `kuery` (fields are prefixed with the
 * package-policy saved-object type server-side).
 */
export const useAgentlessPolicies = (
  {
    page,
    perPage,
    kuery,
  }: {
    page: number;
    perPage: number;
    kuery?: string;
  },
  options: { enabled?: boolean } = {}
) => {
  const { data, isLoading, error, refetch } = useQuery<
    Awaited<ReturnType<typeof sendListAgentlessPolicies>>,
    RequestError
  >(
    ['agentlessPolicies', page, perPage, kuery],
    () => sendListAgentlessPolicies({ page, perPage, kuery }),
    { refetchOnWindowFocus: false, enabled: options.enabled ?? true }
  );

  return { data, isLoading, error: error ?? null, resendRequest: refetch };
};
