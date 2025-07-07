/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool, tool as toTool } from '@langchain/core/tools';
import { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  toSerializedToolIdentifier,
  type SerializedToolIdentifier,
  type StructuredToolIdentifier,
  toStructuredToolIdentifier,
  unknownToolProviderId,
} from '@kbn/onechat-common';
import type { ToolProvider, ExecutableTool } from '@kbn/onechat-server';
import type { ToolCall } from './messages';

export type ToolIdMapping = Map<string, SerializedToolIdentifier>;

export interface ToolsAndMappings {
  /**
   * The tools in langchain format
   */
  tools: StructuredTool[];
  /**
   * ID mapping that can be used to retrieve the full identifier from the langchain tool id.
   */
  idMappings: ToolIdMapping;
}

export const toolsToLangchain = async ({
  request,
  tools,
  logger,
}: {
  request: KibanaRequest;
  tools: ToolProvider | ExecutableTool[];
  logger: Logger;
}): Promise<ToolsAndMappings> => {
  const allTools = Array.isArray(tools) ? tools : await tools.list({ request });
  const mappings = createToolIdMappings(allTools);

  const reverseMappings = reverseMap(mappings);

  const convertedTools = await Promise.all(
    allTools.map((tool) => {
      const toolId = reverseMappings.get(
        toSerializedToolIdentifier({ toolId: tool.id, providerId: tool.meta.providerId })
      );
      return toolToLangchain({ tool, logger, toolId });
    })
  );

  return {
    tools: convertedTools,
    idMappings: mappings,
  };
};

export const createToolIdMappings = (tools: ExecutableTool[]): ToolIdMapping => {
  const toolIds = new Set<string>();
  const mapping: ToolIdMapping = new Map();

  for (const tool of tools) {
    let toolId = tool.id;
    let index = 1;
    while (toolIds.has(toolId)) {
      toolId = `${toolId}_${index++}`;
    }
    toolIds.add(toolId);
    mapping.set(
      toolId,
      toSerializedToolIdentifier({ toolId: tool.id, providerId: tool.meta.providerId })
    );
  }

  return mapping;
};

export const toolToLangchain = ({
  tool,
  toolId,
  logger,
}: {
  tool: ExecutableTool;
  toolId?: string;
  logger: Logger;
}): StructuredTool => {
  return toTool(
    async (input) => {
      try {
        const toolReturn = await tool.execute({ toolParams: input });
        const { result } = toolReturn;
        const content = typeof result === 'string' ? result : JSON.stringify(result);
        return [content, toolReturn];
      } catch (e) {
        logger.warn(`error calling tool ${tool.id}: ${e}`);
        return [`${e}`, { result: { success: false, error: `${e}` } }];
      }
    },
    {
      name: toolId ?? tool.id,
      schema: tool.schema,
      description: tool.description,
      responseFormat: 'content_and_artifact',
      metadata: {
        toolId: tool.id,
        providerId: tool.meta.providerId,
      },
    }
  );
};

export const toolIdentifierFromToolCall = (
  toolCall: ToolCall,
  mapping: ToolIdMapping
): StructuredToolIdentifier => {
  return toStructuredToolIdentifier(
    mapping.get(toolCall.toolName) ?? {
      toolId: toolCall.toolName,
      providerId: unknownToolProviderId,
    }
  );
};

function reverseMap<K, V>(map: Map<K, V>): Map<V, K> {
  const reversed = new Map<V, K>();
  for (const [key, value] of map.entries()) {
    if (reversed.has(value)) {
      throw new Error(`Duplicate value detected while reversing map: ${value}`);
    }
    reversed.set(value, key);
  }
  return reversed;
}
