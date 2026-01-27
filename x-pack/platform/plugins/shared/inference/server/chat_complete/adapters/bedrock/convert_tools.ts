/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, ToolSchemaType } from '@kbn/inference-common';
import { MessageRole, ToolChoiceType, type ToolOptions } from '@kbn/inference-common';
import type { ToolChoice as ConverseBedRockToolChoice } from '@aws-sdk/client-bedrock-runtime';

export const toolChoiceToConverse = (
  toolChoice: ToolOptions['toolChoice']
): ConverseBedRockToolChoice | undefined => {
  if (toolChoice === ToolChoiceType.required) {
    return { any: {} };
  } else if (toolChoice === ToolChoiceType.auto) {
    return { auto: {} };
  } else if (typeof toolChoice === 'object') {
    return { tool: { name: toolChoice.function } };
  }
  // ToolChoiceType.none is not supported by claude
  // we are adding a directive to the system instructions instead in that case.
  return undefined;
};

export const toolsToConverseBedrock = (tools: ToolOptions['tools'], messages: Message[]) => {
  if (tools) {
    return Object.entries(tools).map(([toolName, toolDef]) => {
      return {
        toolSpec: {
          name: toolName,
          description: toolDef.description,
          inputSchema: {
            json: fixSchemaArrayProperties(
              toolDef.schema ?? {
                type: 'object' as const,
                properties: {},
              }
            ),
          },
        },
      };
    });
  }

  const hasToolUse = messages.filter(
    (message) =>
      message.role === MessageRole.Tool ||
      (message.role === MessageRole.Assistant && message.toolCalls?.length)
  );

  if (hasToolUse) {
    return [
      {
        toolSpec: {
          name: 'do_not_call_this_tool',
          description: 'Do not call this tool, it is strictly forbidden',
          inputSchema: {
            json: {
              type: 'object',
              properties: {},
            },
          },
        },
      },
    ];
  }
};

/**
 * Claude is prone to ignoring the "array" part of an array type,
 * so this function patches it to add a message on each
 * array property to explicitly state that the value should
 * be returned as a json array...
 *
 */
export function fixSchemaArrayProperties<T extends ToolSchemaType>(schemaPart: T): T {
  if (schemaPart.type === 'object' && schemaPart.properties) {
    return {
      ...schemaPart,
      properties: Object.fromEntries(
        Object.entries(schemaPart.properties).map(([key, childSchemaPart]) => {
          return [key, fixSchemaArrayProperties(childSchemaPart)];
        })
      ),
    };
  }

  if (schemaPart.type === 'array') {
    return {
      ...schemaPart,
      // Claude is prone to ignoring the "array" part of an array type
      description: schemaPart.description
        ? `${schemaPart.description}. Must be provided as a JSON array`
        : 'Must be provided as a JSON array',
      items: schemaPart.items ? fixSchemaArrayProperties(schemaPart.items) : {},
    };
  }

  return schemaPart;
}
