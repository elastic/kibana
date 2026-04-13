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
              mergeRootAllOfObjectToolSchema(
                toolDef.schema ?? {
                  type: 'object' as const,
                  properties: {},
                }
              )
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
 * Bedrock Converse requires `inputSchema.json.type === "object"`. Zod `intersection` (and similar)
 * often serializes to top-level `allOf` without `type`, which upstream rejects. When every
 * `allOf` branch is a JSON object schema, merge into one object (union of properties / required).
 */
function mergeRootAllOfObjectToolSchema<T extends ToolSchemaType>(schema: T): T {
  const root = schema as unknown as Record<string, unknown>;
  if (root.type === 'object' || !Array.isArray(root.allOf) || root.allOf.length === 0) {
    return schema;
  }

  const mergedProps: Record<string, ToolSchemaType> = {};
  const requiredKeys = new Set<string>();

  for (const fragment of root.allOf) {
    if (!fragment || typeof fragment !== 'object') {
      return schema;
    }
    const part = fragment as Record<string, unknown>;
    if (part.type !== 'object' || !part.properties || typeof part.properties !== 'object') {
      return schema;
    }
    for (const [key, propSchema] of Object.entries(
      part.properties as Record<string, ToolSchemaType>
    )) {
      mergedProps[key] = propSchema;
    }
    if (Array.isArray(part.required)) {
      for (const r of part.required as string[]) {
        requiredKeys.add(r);
      }
    }
  }

  const merged: Record<string, unknown> = {
    type: 'object',
    properties: mergedProps,
  };
  if (typeof root.description === 'string') {
    merged.description = root.description;
  }
  if (requiredKeys.size > 0) {
    merged.required = [...requiredKeys];
  }
  return merged as unknown as T;
}

/**
 * Strips JSON Schema keywords that are not supported by the
 * Bedrock Converse API. According to AWS documentation:
 *  - `propertyNames` is not supported
 *  - `additionalProperties` is not supported for object types
 *  - `$schema` is not supported
 *
 * Also ensures object-typed schemas always have a `properties`
 * field, which the Converse API requires for object types.
 */
function stripUnsupportedSchemaKeywords<T extends ToolSchemaType>(schemaPart: T): T {
  const {
    propertyNames: _propertyNames,
    additionalProperties: _additionalProperties,
    $schema: _$schema,
    ...rest
  } = schemaPart as unknown as Record<string, unknown>;

  // Bedrock requires `properties` on object types
  if (rest.type === 'object' && !rest.properties) {
    rest.properties = {};
  }

  return rest as unknown as T;
}

/**
 * Claude is prone to ignoring the "array" part of an array type,
 * so this function patches it to add a message on each
 * array property to explicitly state that the value should
 * be returned as a json array.
 *
 * Also strips JSON Schema keywords unsupported by Bedrock
 * (e.g. `propertyNames`, `additionalProperties`).
 */
export function fixSchemaArrayProperties<T extends ToolSchemaType>(schemaPart: T): T {
  const cleaned = stripUnsupportedSchemaKeywords(schemaPart);

  if (cleaned.type === 'object' && cleaned.properties) {
    return {
      ...cleaned,
      properties: Object.fromEntries(
        Object.entries(cleaned.properties).map(([key, childSchemaPart]) => {
          return [key, fixSchemaArrayProperties(childSchemaPart)];
        })
      ),
    };
  }

  if (cleaned.type === 'array') {
    return {
      ...cleaned,
      // Claude is prone to ignoring the "array" part of an array type
      description: cleaned.description
        ? `${cleaned.description}. Must be provided as a JSON array`
        : 'Must be provided as a JSON array',
      items: cleaned.items ? fixSchemaArrayProperties(cleaned.items) : {},
    };
  }

  return cleaned;
}
