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
import { WorkflowsApi } from '../services/workflows_api';
import { workflowKeys } from './query_key_factory';

interface UseFetchWorkflowsParams {
  query: string;
  isEnabled?: boolean;
}

export const useFetchWorkflows = ({ query, isEnabled = true }: UseFetchWorkflowsParams) => {
  const workflowsApi = useService(WorkflowsApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<WorkflowListDto, Error>({
    queryKey: workflowKeys.search({ query }),
    queryFn: () => workflowsApi.searchWorkflows({ query, size: 100, page: 1 }),
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
