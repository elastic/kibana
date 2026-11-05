/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyTestPreviewResponse } from '@kbn/alerting-v2-schemas';
import { useService } from '@kbn/core-di-browser';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { actionPolicyKeys } from './query_key_factory';

/**
 * Builds the synthetic test notification of an action policy once. The server picks the seed, and
 * sending reuses it, so the payload sent is the one previewed. `reload` drops the preview and builds
 * a new one with a new seed.
 */
export const usePreviewTestNotification = (policyId: string) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const queryClient = useQueryClient();
  const queryKey = actionPolicyKeys.testPreview(policyId);

  const { data, isLoading, error } = useQuery<ActionPolicyTestPreviewResponse, Error>({
    queryKey,
    queryFn: () => actionPoliciesApi.previewTestNotification(policyId),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    cacheTime: 0,
  });

  const reload = () => queryClient.resetQueries({ queryKey });

  return { data, isLoading, error, reload };
};
