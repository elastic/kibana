/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import type { WorkflowsSearchParams, WorkflowStatsDto } from '@kbn/workflows/types/v1';
import { useWorkflowsApi } from '@kbn/workflows-ui';

export function useWorkflowStats() {
  const api = useWorkflowsApi();

  return useQuery<WorkflowStatsDto>({
    networkMode: 'always',
    queryKey: ['workflows', 'stats'],
    queryFn: () => api.getStats(),
  });
}

export function useWorkflowFiltersOptions(
  fields: string[],
  managed?: WorkflowsSearchParams['managed']
) {
  const api = useWorkflowsApi();

  return useQuery<Record<string, Array<EuiSelectableOption>>>({
    networkMode: 'always',
    queryKey: ['workflows', 'aggs', fields, managed],
    queryFn: () => api.getAggs({ fields, managed }),
  });
}
