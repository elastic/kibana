/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { BulkCreateMcpToolsResponse } from '../../../../common/http_api/tools';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

export interface BulkImportMcpToolsOptions {
  connectorId: string;
  tools: Array<{ name: string; description?: string }>;
  namespace?: string;
  tags?: string[];
  skipExisting?: boolean;
}

export const useBulkImportMcpTools = () => {
  const { toolsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectorId,
      tools,
      namespace,
      tags,
      skipExisting,
    }: BulkImportMcpToolsOptions): Promise<BulkCreateMcpToolsResponse> => {
      return toolsService.bulkCreateMcpTools({
        connectorId,
        tools,
        namespace,
        tags,
        skipExisting,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.all });
    },
  });
};
