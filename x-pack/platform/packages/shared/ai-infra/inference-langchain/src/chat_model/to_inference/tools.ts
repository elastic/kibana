/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { zodToJsonSchema, type JsonSchema7Type } from 'zod-to-json-schema';
import { type BindToolsInput } from '@langchain/core/language_models/chat_models';
import type { ToolDefinition } from '@langchain/core/language_models/base';
import { isLangChainTool } from '@langchain/core/utils/function_calling';
import { isInteropZodSchema } from '@langchain/core/utils/types';
import type {
  ToolDefinition as ToolDefinitionInference,
  ToolChoice as ToolChoiceInference,
  ToolSchema,
} from '@kbn/inference-common';
import { ToolChoiceType } from '@kbn/inference-common';
import type { ToolChoice } from '../types';

export const toolDefinitionToInference = (
  tools: BindToolsInput[]
): Record<string, ToolDefinitionInference> => {
  const definitions: Record<string, ToolDefinitionInference> = {};
  tools.forEach((tool) => {
    if (isLangChainTool(tool)) {
      definitions[tool.name] = {
        description: tool.description ?? tool.name,
        schema: tool.schema ? resolveToolSchema(tool.schema) : undefined,
      };
    } else if (isToolDefinition(tool)) {
      definitions[tool.function.name] = {
        description: tool.function.description ?? tool.function.name,
        schema: resolveToolSchema(tool.function.parameters),
      };
    }
  });
  return definitions;
};

export const toolChoiceToInference = (toolChoice: ToolChoice): ToolChoiceInference => {
  if (toolChoice === 'any') {
    return ToolChoiceType.required;
  }
  if (toolChoice === 'auto') {
    return ToolChoiceType.auto;
  }
  if (toolChoice === 'none') {
    return ToolChoiceType.none;
  }
  return {
    function: toolChoice,
  };
};

function isToolDefinition(def: BindToolsInput): def is ToolDefinition {
  return 'type' in def && def.type === 'function' && 'function' in def && typeof def === 'object';
}

function resolveToolSchema(schema: unknown): ToolSchema {
  if (isInteropZodSchema(schema)) {
    return pick(
      zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0]),
      ['type', 'properties', 'required']
    ) as ToolSchema;
  }
  return pick(schema as JsonSchema7Type, ['type', 'properties', 'required']) as ToolSchema;
}
