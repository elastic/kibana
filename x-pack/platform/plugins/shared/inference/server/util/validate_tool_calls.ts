/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Ajv from 'ajv';
import {
  ToolCallsOf,
  ToolChoiceType,
  ToolOptions,
  UnvalidatedToolCall,
} from '@kbn/inference-common';
import { createToolNotFoundError, createToolValidationError } from '../chat_complete/errors';

export function validateToolCalls<TToolOptions extends ToolOptions>({
  toolCalls,
  toolChoice,
  tools,
}: TToolOptions & { toolCalls: UnvalidatedToolCall[] }): ToolCallsOf<TToolOptions>['toolCalls'] {
  const validator = new Ajv();

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
      throw createToolNotFoundError(toolCall.function.name);
    }

    const toolSchema = tool.schema ?? { type: 'object', properties: {} };

    let serializedArguments: ToolCallsOf<TToolOptions>['toolCalls'][0]['function']['arguments'];

    try {
      serializedArguments = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      throw createToolValidationError(`Failed parsing arguments for ${toolCall.function.name}`, {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
        toolCalls: [toolCall],
      });
    }

    const valid = validator.validate(toolSchema, serializedArguments);

    if (!valid) {
      throw createToolValidationError(
        `Tool call arguments for ${toolCall.function.name} were invalid`,
        {
          name: toolCall.function.name,
          errorsText: validator.errorsText(),
          arguments: toolCall.function.arguments,
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
