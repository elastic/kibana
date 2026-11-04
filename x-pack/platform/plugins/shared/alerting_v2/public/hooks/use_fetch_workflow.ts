/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import { isNotFoundError } from '../utils/is_not_found_error';
import { workflowKeys } from './query_key_factory';

const DEFAULT_MAX_RETRIES = 3;

export const useFetchWorkflow = (
  id: string | undefined,
  isEnabled = true,
  { notifyOnError = true }: { notifyOnError?: boolean } = {}
) => {
  const workflowsApi = useService(WorkflowApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<WorkflowDetailDto, Error>({
    queryKey: workflowKeys.detail(id!),
    queryFn: () => workflowsApi.getWorkflow(id!),
    enabled: !!id && isEnabled,
    refetchOnWindowFocus: false,
    // Don't retry 404s — the workflow is gone, retrying just delays the not-found
    // UI. Other errors (network, 5xx) keep the default retry behaviour.
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < DEFAULT_MAX_RETRIES,
    onError: (error: Error) => {
      if (!notifyOnError) {
        return;
      }
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.workflow.fetchError', {
          defaultMessage: 'Failed to load workflow',
        }),
      });
    },
  });
};
