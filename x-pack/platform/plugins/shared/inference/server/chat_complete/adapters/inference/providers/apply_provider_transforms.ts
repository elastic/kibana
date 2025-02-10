/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceEndpointProvider, MessageRole, ToolOptions } from '@kbn/inference-common';
import { fixSchemaArrayProperties } from '../../bedrock/convert_tools';
import type { CreateOpenAIRequestOptions } from '../types';
import { getProvider, getElasticModelProvider } from '../utils';

export const applyProviderTransforms = (
  options: CreateOpenAIRequestOptions
): CreateOpenAIRequestOptions => {
  let provider = getProvider(options.connector);
  if (provider === InferenceEndpointProvider.Elastic) {
    // retrieve the underlying provider used by elastic
    provider = getElasticModelProvider(options.connector);
  }

  if (provider === InferenceEndpointProvider.AmazonBedrock) {
    options = applyBedrockTransforms(options);
  }

  return options;
};

const applyBedrockTransforms = (
  options: CreateOpenAIRequestOptions
): CreateOpenAIRequestOptions => {
  if (options.tools) {
    options.tools = Object.entries(options.tools).reduce((tools, [toolName, toolDef]) => {
      tools[toolName] = {
        ...toolDef,
        schema: toolDef.schema ? fixSchemaArrayProperties(toolDef.schema) : undefined,
      };

      return tools;
    }, {} as Required<ToolOptions>['tools']);
  }

  const hasToolUse = options.messages.some(
    (message) =>
      message.role === MessageRole.Tool ||
      (message.role === MessageRole.Assistant && message.toolCalls?.length)
  );

  // bedrock does not accept tool calls in conversation history
  // if no tools are present in the request.
  if (hasToolUse && Object.keys(options.tools ?? {}).length === 0) {
    options.tools = {
      doNotCallThisTool: {
        description: 'Do not call this tool, it is strictly forbidden',
        schema: {
          type: 'object',
          properties: {},
        },
      },
    };
  }

  return options;
};
