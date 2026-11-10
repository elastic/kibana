/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { StructuredTool } from '@langchain/core/tools';
import { tool as toTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/logging';
import type { ChatAgentEvent, DynamicToolDefinition, ToolResult } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import type {
  AgentBuilderToolEvent,
  AgentEventEmitterFn,
  ExecutableTool,
  RunToolReturn,
  ToolEventHandlerFn,
} from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { isDynamicToolEvent, isDynamicToolRunReturn } from '@kbn/agent-builder-server/runner';
import { zodToolInputToJsonSchema } from '../tools/utils/json_schema';
import type { ToolCall } from './messages';

export type ToolIdMapping = Map<string, string>;

/**
 * Name of the optional parameter injected into every tool schema (when `addIntentParam` is set),
 * used by the model to describe what it is doing with the call. Stripped before the tool runs.
 */
export const INTENT_PARAM = '_intent';

const INTENT_PARAM_DESCRIPTION =
  'Clear, concise description of what you are doing by calling this tool';

export const sanitizeToolId = (toolId: string): string => {
  return toolId.replaceAll('.', '_').replace(/[^a-zA-Z0-9_-]/g, '');
};

/**
 * Create a [agentBuilder tool id] -> [langchain tool id] mapping.
 *
 * Handles id sanitization (e.g. removing dot prefixes), and potential id conflict.
 */
export const createToolIdMappings = <T extends { id: string }>(tools: T[]): ToolIdMapping => {
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

export interface BuildToolContentParams {
  results: ToolResult[];
  toolId: string;
  toolCallId: string;
  dynamicToolId?: string;
}

export type BuildToolContentFn = (params: BuildToolContentParams) => string;

/** The description the model sees for a tool, natively bound or dynamic. */
const getToolLlmDescription = async (tool: ExecutableTool): Promise<string> =>
  tool.getLlmDescription
    ? tool.getLlmDescription({ description: tool.description, config: tool.configuration })
    : tool.description;

/**
 * Renders the definition the model sees for a dynamic tool: the description and input schema
 * `toolToLangchain` gives it as a native tool, with the schema serialized the same way the
 * inference adapter serializes natively bound tools.
 */
export const renderDynamicToolDefinition = async (
  tool: ExecutableTool
): Promise<DynamicToolDefinition> => {
  const description = await getToolLlmDescription(tool);
  const schema = await tool.getSchema();
  return {
    tool_id: tool.id,
    description,
    parameters: zodToolInputToJsonSchema(schema),
  };
};

export const toolToLangchain = async ({
  tool,
  toolId,
  logger,
  sendEvent,
  addIntentParam = false,
  buildContent = ({ results }) => JSON.stringify({ results }),
}: {
  tool: ExecutableTool;
  toolId?: string;
  logger: Logger;
  sendEvent?: AgentEventEmitterFn;
  addIntentParam?: boolean;
  buildContent?: BuildToolContentFn;
}): Promise<StructuredTool> => {
  const description = await getToolLlmDescription(tool);

  const schema = await tool.getSchema();

  return toTool(
    async (rawInput: Record<string, unknown>, config): Promise<[string, RunToolReturn]> => {
      const toolCallId = config.configurable?.tool_call_id ?? config.toolCall?.id ?? 'unknown';

      let onEvent: ToolEventHandlerFn | undefined;
      if (sendEvent) {
        const convertEvent = getToolEventConverter({ toolId: tool.id, toolCallId });
        onEvent = (event) => {
          sendEvent(convertEvent(event));
        };
      }

      // remove internal parameters before calling tool handler.
      const input = omit(rawInput, [INTENT_PARAM]);

      try {
        const toolReturn = await tool.execute({
          toolParams: input,
          onEvent,
          toolCallId,
          source: 'agent',
        });
        const content = buildContent({
          results: toolReturn.results ?? [],
          toolId: tool.id,
          toolCallId,
          dynamicToolId: isDynamicToolRunReturn(toolReturn) ? toolReturn.dynamicToolId : undefined,
        });
        return [content, toolReturn];
      } catch (e) {
        logger.warn(`error calling tool ${tool.id}: ${e}`);
        logger.debug(e.stack);

        const errorToolReturn: RunToolReturn = {
          results: [createErrorResult(e.message)],
        };

        return [`${e}`, errorToolReturn];
      }
    },
    {
      name: toolId ?? tool.id,
      // safeExtend keeps the object-level config of the tool schema (strict, catchall, refinements)
      schema: addIntentParam
        ? schema.safeExtend({
            [INTENT_PARAM]: z.string().optional().describe(INTENT_PARAM_DESCRIPTION),
          })
        : schema,
      description,
      verboseParsingErrors: true,
      responseFormat: 'content_and_artifact',
      metadata: {
        toolId: tool.id,
      },
    }
  );
};

export const toolIdentifierFromToolCall = (toolCall: ToolCall, mapping: ToolIdMapping): string => {
  return mapping.get(toolCall.toolName) ?? toolCall.toolName;
};

export function reverseMap<K, V>(map: Map<K, V>): Map<V, K> {
  const reversed = new Map<V, K>();
  for (const [key, value] of map.entries()) {
    if (reversed.has(value)) {
      throw new Error(`Duplicate value detected while reversing map: ${value}`);
    }
    reversed.set(value, key);
  }
  return reversed;
}

const getToolEventConverter = ({ toolId, toolCallId }: { toolId: string; toolCallId: string }) => {
  return (toolEvent: AgentBuilderToolEvent): ChatAgentEvent => {
    if (isDynamicToolEvent(toolEvent)) {
      return getToolEventConverter({ toolId: toolEvent.data.tool_id, toolCallId })(
        toolEvent.data.event
      );
    }
    if (toolEvent.type === ChatEventType.toolProgress) {
      return {
        type: ChatEventType.toolProgress,
        data: {
          ...toolEvent.data,
          tool_call_id: toolCallId,
        },
      };
    }
    if (toolEvent.type === ChatEventType.toolUi) {
      return {
        type: ChatEventType.toolUi,
        data: {
          ...toolEvent.data,
          tool_id: toolId,
          tool_call_id: toolCallId,
        },
      };
    }

    // @ts-expect-error all possible subtypes are handled
    throw new Error(`Invalid tool call type ${toolEvent.type}`);
  };
};
