/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { WorkflowListDto } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import { workflowKeys } from './query_key_factory';

interface UseFetchWorkflowsParams {
  query: string;
  tags?: string[];
  isEnabled?: boolean;
}

export const useFetchWorkflows = ({ query, tags, isEnabled = true }: UseFetchWorkflowsParams) => {
  const workflowsApi = useService(WorkflowApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<WorkflowListDto, Error>({
    queryKey: workflowKeys.search({ query, tags }),
    queryFn: () => workflowsApi.getWorkflows({ query, tags, size: 100, page: 1 }),
    enabled: isEnabled,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.workflows.fetchError', {
          defaultMessage: 'Failed to load workflows',
        }),
      });
    },
  });
};
