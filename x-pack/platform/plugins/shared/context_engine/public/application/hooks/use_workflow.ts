/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';

export const useWorkflow = (workflowId: string) => {
  const api = useWorkflowsApi();

  return useQuery({
    queryKey: ['context_engine', 'workflow', workflowId],
    queryFn: () => api.getWorkflow(workflowId),
  });
};
