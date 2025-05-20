/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { type BindToolsInput } from '@langchain/core/language_models/chat_models';
import { ToolDefinition } from '@langchain/core/language_models/base';
import { isLangChainTool } from '@langchain/core/utils/function_calling';
import { isZodSchema } from '@langchain/core/utils/types';
import {
  ToolDefinition as ToolDefinitionInference,
  ToolChoice as ToolChoiceInference,
  ToolChoiceType,
  ToolSchema,
} from '@kbn/inference-common';
import { StructuredToolParams } from '@langchain/core/dist/tools';
import type { ToolChoice } from '../types';

export const toolDefinitionToInference = (
  tools: BindToolsInput[]
): Record<string, ToolDefinitionInference> => {
  const definitions: Record<string, ToolDefinitionInference> = {};
  tools.forEach((tool) => {
    if (isLangChainTool(tool)) {
      definitions[tool.name] = {
        description: tool.description ?? tool.name,
        schema: tool.schema ? zodSchemaToInference(tool.schema) : undefined,
      };
    } else if (isToolDefinition(tool)) {
      definitions[tool.function.name] = {
        description: tool.function.description ?? tool.function.name,
        schema: isZodSchema(tool.function.parameters)
          ? zodSchemaToInference(tool.function.parameters)
          : (pick(tool.function.parameters, ['type', 'properties', 'required']) as ToolSchema),
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

function zodSchemaToInference(schema: StructuredToolParams['schema']): ToolSchema {
  if (isZodSchema(schema)) {
    return pick(zodToJsonSchema(schema), ['type', 'properties', 'required']) as ToolSchema;
  }
  throw new Error('Only Zod schemas are supported for now');
}
