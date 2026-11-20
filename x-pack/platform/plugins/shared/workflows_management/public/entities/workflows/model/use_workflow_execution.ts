/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';

interface UseWorkflowExecutionParams {
  executionId: string | null;
  enabled?: boolean;
  includeInput?: boolean;
  includeOutput?: boolean;
}

export function useWorkflowExecution({
  executionId,
  enabled = true,
  includeInput,
  includeOutput,
}: UseWorkflowExecutionParams) {
  const api = useWorkflowsApi();

  return useQuery<WorkflowExecutionDto | null>({
    queryKey: ['workflowExecution', executionId, includeInput, includeOutput],
    queryFn: async () => {
      if (!executionId) return null;
      return api.getExecution(executionId, { includeInput, includeOutput });
    },
    enabled: enabled && executionId !== null,
  });
}
