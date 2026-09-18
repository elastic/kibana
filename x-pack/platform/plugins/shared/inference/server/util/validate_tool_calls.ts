/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { Logger } from '@kbn/logging';
import type { ToolCall, ToolOptions, UnvalidatedToolCall } from '@kbn/inference-common';
import { ToolChoiceType } from '@kbn/inference-common';
import type { ToolCallOfToolOptions } from '@kbn/inference-common';
import {
  createToolNotFoundError,
  createToolValidationError,
} from '../../common/chat_complete/errors';

export function validateToolCalls<TToolOptions extends ToolOptions>({
  toolCalls,
  toolChoice,
  tools,
  logger,
}: TToolOptions & {
  toolCalls: UnvalidatedToolCall[];
  logger?: Pick<Logger, 'debug'>;
}): ToolCallOfToolOptions<TToolOptions>[];

export function validateToolCalls({
  toolCalls,
  toolChoice,
  tools,
  logger,
}: ToolOptions & {
  toolCalls: UnvalidatedToolCall[];
  logger?: Pick<Logger, 'debug'>;
}): ToolCall[] {
  // Models under token pressure occasionally emit malformed tool calls with
  // an empty or whitespace-only name. Such a call cannot be attributed to any
  // tool (the tools map lookup would throw `toolNotFoundError: Tool "" called`),
  // so it is dropped here — with a log line, so the occurrence stays visible
  // instead of silently disappearing. The model either re-emits on the next
  // turn or proceeds without.
  const sanitizedToolCalls = toolCalls.filter((toolCall) => {
    const name = toolCall.function.name?.trim();
    const isValid = name !== undefined && name.length > 0;
    if (!isValid) {
      logger?.debug(() => `Dropping tool call with an empty name: ${JSON.stringify(toolCall)}`);
    }
    return isValid;
  });

  if (sanitizedToolCalls.length && toolChoice === ToolChoiceType.none) {
    throw createToolValidationError(
      `tool_choice was "none" but ${sanitizedToolCalls
        .map((toolCall) => toolCall.function.name)
        .join(', ')} was/were called`,
      { toolCalls: sanitizedToolCalls }
    );
  }

  return sanitizedToolCalls.map((toolCall) => {
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
      // Malformed JSON arguments stay a `ToolValidationError`: `error_retry_filter`
      // classifies it as recoverable, so `retryWithExponentialBackoff` re-issues the
      // completion, and the structured-output path (`create_output_api`) uses the
      // rejection to re-prompt the model with the failure. Dropping the call instead
      // would leave both self-correction paths with nothing to act on.
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
        zodSchema.parse(serializedArguments);
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
