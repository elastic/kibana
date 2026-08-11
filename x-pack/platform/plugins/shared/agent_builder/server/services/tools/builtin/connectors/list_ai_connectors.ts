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
 * Creates the list_ai_connectors tool.
 *
 * Lists available AI/model connectors (id, name, type) by delegating to the inference plugin's
 * `getConnectorList(request)` start contract. General-purpose: any skill that needs to resolve a
 * model name to a connector id can use it. Not specific to Automatic Migration.
 *
 * Registered by the agent_builder plugin (which already depends on inference), alongside
 * execute_connector_sub_action — no selfClient HTTP hop and no duplicated connector logic.
 */
export const createListAiConnectorsTool = ({
  getInference,
}: ConnectorToolsOptions): BuiltinToolDefinition<typeof schema> => ({
  id: platformCoreTools.listAiConnectors,
  type: ToolType.builtin,
  description:
    'List available AI/model connectors (id, name, type) so the agent can resolve a model name the user mentioned to its connector id. Never guess connector ids or default to the first one — always ask the user to pick from this list.',
  schema,
  tags: ['connector', 'ai'],
  availability: {
    // Connectors are space-scoped, so cache the result per space.
    cacheMode: 'space',
    handler: async () => ({ status: 'available' }),
  },
  handler: async (_input, { request, logger }) => {
    try {
      const inference = await getInference();
      const connectors = await inference.getConnectorList(request);
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: { total: connectors.length, connectors },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`list_ai_connectors failed: ${message}`);
      return {
        results: [createErrorResult({ message: `Failed to list AI connectors: ${message}` })],
      };
    }
  },
});
