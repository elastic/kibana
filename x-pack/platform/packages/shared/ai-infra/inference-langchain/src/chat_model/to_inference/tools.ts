/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { type BindToolsInput } from '@langchain/core/language_models/chat_models';
import { isLangChainTool } from '@langchain/core/utils/function_calling';
import {
  ToolDefinition,
  ToolChoice as ToolChoiceInference,
  ToolChoiceType,
  ToolSchema,
} from '@kbn/inference-common';
import type { ToolChoice } from '../types';

export const toolDefinitionToInference = (
  tools: BindToolsInput[]
): Record<string, ToolDefinition> => {
  const definitions: Record<string, ToolDefinition> = {};
  tools.forEach((tool) => {
    if (isLangChainTool(tool)) {
      definitions[tool.name] = {
        description: tool.description ?? tool.name,
        schema: tool.schema
          ? (pick(zodToJsonSchema(tool.schema), ['type', 'properties', 'required']) as ToolSchema)
          : undefined,
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
