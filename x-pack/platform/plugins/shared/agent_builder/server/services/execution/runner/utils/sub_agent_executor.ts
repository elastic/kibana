/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SubAgentExecutor } from '@kbn/agent-builder-server';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';

export const createSubAgentExecutor = ({
  request,
  getExecutionService,
}: {
  request: KibanaRequest;
  getExecutionService: () => AgentExecutionService;
}): SubAgentExecutor => {
  return {
    executeSubAgent: async (params) => {
      const executionService = getExecutionService();
      return executionService.executeAgent({
        mode: AgentExecutionMode.standalone,
        request,
        params: {
          agentId: params.agentId,
          connectorId: params.connectorId,
          capabilities: params.capabilities,
          parentExecutionId: params.parentExecutionId,
          nextInput: { message: params.prompt },
        },
        abortSignal: params.abortSignal,
      });
    },
    getExecution: async (executionId) => {
      const executionService = getExecutionService();
      return executionService.getExecution(executionId);
    },
  };
};
