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
import { retryUnlessNotFound } from '../utils/is_not_found_error';
import { workflowKeys } from './query_key_factory';

export const getWorkflowDetailQueryOptions = (workflowsApi: WorkflowApi, id: string) => ({
  queryKey: workflowKeys.detail(id),
  queryFn: () => workflowsApi.getWorkflow(id),
  refetchOnWindowFocus: false,
  retry: retryUnlessNotFound,
});

export const useFetchWorkflow = (
  id: string | undefined,
  isEnabled = true,
  { notifyOnError = true }: { notifyOnError?: boolean } = {}
) => {
  const workflowsApi = useService(WorkflowApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<WorkflowDetailDto, Error>({
    ...getWorkflowDetailQueryOptions(workflowsApi, id ?? ''),
    enabled: !!id && isEnabled,
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
