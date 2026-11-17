/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import { getWorkflowDetailQueryOptions } from './use_fetch_workflow';

export const useFetchWorkflowsByIds = (
  ids: readonly string[],
  isEnabled = true
): WorkflowDetailDto[] => {
  const workflowsApi = useService(WorkflowApi);

  const results = useQueries({
    queries: ids.map((id) => ({
      ...getWorkflowDetailQueryOptions(workflowsApi, id),
      enabled: isEnabled,
    })),
  });

  return results.flatMap(({ data }) => (data ? [data] : []));
};
