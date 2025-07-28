/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool, tool as toTool } from '@langchain/core/tools';
import { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolProvider, ExecutableTool } from '@kbn/onechat-server';
import type { ToolCall } from './messages';

export type ToolIdMapping = Map<string, string>;

export interface ToolsAndMappings {
  /**
   * The tools in langchain format
   */
  tools: StructuredTool[];
  /**
   * ID mapping that can be used to retrieve the onechat tool id from the langchain tool id.
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
  const onechatToLangchainIdMap = createToolIdMappings(allTools);

  const convertedTools = await Promise.all(
    allTools.map((tool) => {
      const toolId = onechatToLangchainIdMap.get(tool.id);
      return toolToLangchain({ tool, logger, toolId });
    })
  );

  const reverseMappings = reverseMap(onechatToLangchainIdMap);

  return {
    tools: convertedTools,
    idMappings: reverseMappings,
  };
};

export const sanitizeToolId = (toolId: string): string => {
  return toolId.replace(/[^a-zA-Z0-9_-]/g, '');
};

/**
 * Create a [onechat tool id] -> [langchain tool id] mapping.
 *
 * Handles id sanitization (e.g. removing dot prefixes), and potential id conflict.
 */
export const createToolIdMappings = (tools: ExecutableTool[]): ToolIdMapping => {
  const toolIds = new Set<string>();
  const mapping: ToolIdMapping = new Map();

  for (const tool of tools) {
    let toolId = sanitizeToolId(tool.id);
    let index = 1;
    while (toolIds.has(toolId)) {
      toolId = `${toolId}_${index++}`;
    }
    toolIds.add(toolId);
    mapping.set(tool.id, toolId);
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
        toolType: tool.type,
      },
    }
  );
};

export const toolIdentifierFromToolCall = (toolCall: ToolCall, mapping: ToolIdMapping): string => {
  return mapping.get(toolCall.toolName) ?? toolCall.toolName;
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
