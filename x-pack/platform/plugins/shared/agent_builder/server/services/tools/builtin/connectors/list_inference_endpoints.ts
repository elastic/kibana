/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { ConnectorToolsOptions } from './types';

const schema = z.object({});

/**
 * Creates the list_inference_endpoints tool.
 *
 * Lists available inference endpoints (AI connectors)
 */
export const createListInferenceEndpointsTool = ({
  getInference,
}: ConnectorToolsOptions): BuiltinToolDefinition<typeof schema> => ({
  id: platformCoreTools.listInferenceEndpoints,
  type: ToolType.builtin,
  annotations: {
    title: 'List Inference Endpoints',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: `
    List available inference endpoints (AI connectors/models) with their IDs, names, and types.
`,
  schema,
  tags: ['connector', 'ai', 'inference'],
  availability: {
    // Inference endpoints are space-scoped, so cache the result per space.
    cacheMode: 'space',
    handler: async () => ({ status: 'available' }),
  },
  handler: async (_input, { request, logger }) => {
    try {
      const inference = await getInference();
      const connectors = await inference.getConnectorList(request);
      const endpoints = connectors.map(({ connectorId, name, type }) => ({
        connectorId,
        name,
        type,
      }));

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: { total: endpoints.length, endpoints },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`list_inference_endpoints failed: ${message}`);
      return {
        results: [createErrorResult({ message: `Failed to list inference endpoints: ${message}` })],
      };
    }
  },
});
