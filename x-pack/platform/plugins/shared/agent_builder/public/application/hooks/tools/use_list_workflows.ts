/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { WorkflowComboBoxOption } from '@kbn/agent-builder-browser';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

interface ListWorkflowsResponse {
  results: WorkflowComboBoxOption[];
}

export const useListWorkflows = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { toolsService } = useAgentBuilderServices();

  const result = useQuery({
    queryKey: queryKeys.tools.workflows.list(),
    queryFn: async (): Promise<ListWorkflowsResponse> => {
      return await toolsService.listWorkflows({ page: 1, limit: 1000 });
    },
    enabled,
  });

  return {
    ...result,
    data: result.data?.results,
  };
};
