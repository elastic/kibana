/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { ToolCall, ToolOptions, UnvalidatedToolCall } from '@kbn/inference-common';
import { ToolChoiceType } from '@kbn/inference-common';
import type { ToolCallOfToolOptions } from '@kbn/inference-common';
import {
  createToolNotFoundError,
  createToolValidationError,
} from '../../common/chat_complete/errors';

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const expectsStructuredValue = (schema: JsonObject): boolean => {
  const { type } = schema;
  const types = Array.isArray(type) ? type : [type];
  return types.includes('object') || types.includes('array');
};

/**
 * Models sometimes send an object or array argument as a JSON string. Following the schema, parses
 * such strings back into the structure the schema asks for and leaves every other value as it is.
 */
const parseJsonEncodedValues = (value: unknown, schema: unknown): unknown => {
  if (!isJsonObject(schema)) return value;

  if (typeof value === 'string' && expectsStructuredValue(schema)) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return parseJsonEncodedValues(parsed, schema);
      }
    } catch (error) {
      return value;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => parseJsonEncodedValues(item, schema.items));
  }

  if (isJsonObject(value) && isJsonObject(schema.properties)) {
    const properties = schema.properties;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        parseJsonEncodedValues(item, properties[key]),
      ])
    );
  }

  return value;
};

export function validateToolCalls<TToolOptions extends ToolOptions>({
  toolCalls,
  toolChoice,
  tools,
}: TToolOptions & { toolCalls: UnvalidatedToolCall[] }): ToolCallOfToolOptions<TToolOptions>[];

export function validateToolCalls({
  toolCalls,
  toolChoice,
  tools,
}: ToolOptions & { toolCalls: UnvalidatedToolCall[] }): ToolCall[] {
  if (toolCalls.length && toolChoice === ToolChoiceType.none) {
    throw createToolValidationError(
      `tool_choice was "none" but ${toolCalls
        .map((toolCall) => toolCall.function.name)
        .join(', ')} was/were called`,
      { toolCalls }
    );
  }

  return toolCalls.map((toolCall) => {
    const tool = tools?.[toolCall.function.name];

    if (!tool) {
      throw createToolNotFoundError({
        name: toolCall.function.name,
        args: toolCall.function.arguments,
      });
    }

    const toolSchema = tool.schema ?? { type: 'object', properties: {} };

    let serializedArguments: Record<string, unknown>;

    try {
      serializedArguments = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      throw createToolValidationError(`Failed parsing arguments for ${toolCall.function.name}`, {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
        toolCalls: [toolCall],
      });
    }

    try {
      // ToolSchema is compatible with JsonSchema but TypeScript can't infer
      // the recursive type compatibility, so we assert it as Record<string, unknown>
      const zodSchema = fromJSONSchema(toolSchema as unknown as Record<string, unknown>);
      if (zodSchema) {
        const firstAttempt = zodSchema.safeParse(serializedArguments);
        if (!firstAttempt.success) {
          // Only values that failed validation are repaired, so valid arguments are never changed.
          const repaired = parseJsonEncodedValues(serializedArguments, toolSchema);
          const secondAttempt = zodSchema.safeParse(repaired);
          if (!secondAttempt.success) {
            throw firstAttempt.error;
          }
          serializedArguments = repaired as Record<string, unknown>;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof z.ZodError
          ? error?.issues?.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          : error instanceof Error
          ? error.message
          : 'Unknown validation error';

      throw createToolValidationError(
        `Tool call arguments for ${toolCall.function.name} (${toolCall.toolCallId}) were invalid`,
        {
          name: toolCall.function.name,
          errorsText: errorMessage,
          arguments: toolCall.function.arguments,
          toolCalls,
        }
      );
    }

    return {
      toolCallId: toolCall.toolCallId,
      function: {
        name: toolCall.function.name,
        arguments: serializedArguments,
      },
    };
  });
}
