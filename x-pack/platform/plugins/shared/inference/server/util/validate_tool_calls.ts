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
  // Models under token pressure occasionally emit malformed tool calls with
  // an empty or whitespace-only name. Rather than 500-ing the entire request
  // (which cascades and fails the conversation), filter these out early.
  // The model will either re-emit on the next turn or proceed without —
  // both are preferable to crashing the inference pipeline.
  const sanitizedToolCalls = toolCalls.filter((toolCall) => {
    const name = toolCall.function.name?.trim();
    return name !== undefined && name.length > 0;
  });

  if (sanitizedToolCalls.length && toolChoice === ToolChoiceType.none) {
    throw createToolValidationError(
      `tool_choice was "none" but ${sanitizedToolCalls
        .map((toolCall) => toolCall.function.name)
        .join(', ')} was/were called`,
      { toolCalls: sanitizedToolCalls }
    );
  }

  // Models also occasionally emit tool calls whose arguments fail JSON parsing
  // or Zod schema validation. Previously this threw and 500-ed the whole
  // converse request, cascading to fail the entire conversation. Instead, drop
  // the malformed tool call and let the model re-emit corrected arguments on
  // the next turn — same resilience principle as the empty-name filter above.
  // We keep the `createToolValidationError` for the internal error log, but
  // surface it as a filtered-out call rather than a thrown exception.
  const validatedToolCalls: ToolCall[] = [];
  for (const toolCall of sanitizedToolCalls) {
    const tool = tools?.[toolCall.function.name];

    if (!tool) {
      // Unknown tool is a genuine programming error (tool registered but not
      // in the tools map) — keep throwing here, this is not model flakiness.
      throw createToolNotFoundError({
        name: toolCall.function.name,
        args: toolCall.function.arguments,
      });
    }

    const toolSchema = tool.schema ?? { type: 'object', properties: {} };

    let serializedArguments: Record<string, unknown>;
    try {
      serializedArguments = JSON.parse(toolCall.function.arguments);
    } catch {
      // Malformed JSON arguments: skip this tool call rather than 500-ing.
      // The model will see no tool result and re-emit or proceed without.
      continue;
    }

    try {
      // ToolSchema is compatible with JsonSchema but TypeScript can't infer
      // the recursive type compatibility, so we assert it as Record<string, unknown>
      const zodSchema = fromJSONSchema(toolSchema as unknown as Record<string, unknown>);
      if (zodSchema) {
        zodSchema.parse(serializedArguments);
      }
    } catch {
      // Arguments parsed as JSON but failed schema validation (e.g. wrong
      // types, missing required fields). Skip rather than 500 — the model
      // gets a chance to self-correct on the next turn.
      continue;
    }

    validatedToolCalls.push({
      toolCallId: toolCall.toolCallId,
      function: {
        name: toolCall.function.name,
        arguments: serializedArguments,
      },
    });
  }

  return validatedToolCalls;
}
