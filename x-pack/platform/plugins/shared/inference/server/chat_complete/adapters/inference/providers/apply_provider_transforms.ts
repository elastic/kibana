/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolOptions } from '@kbn/inference-common';
import { InferenceEndpointProvider } from '@kbn/inference-common';
import { fixSchemaArrayProperties } from '../../bedrock/convert_tools';
import { ensureToolsWhenHistoryHasToolUse } from '../../../utils/ensure_tools_when_history_has_tool_use';
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

  options.tools = ensureToolsWhenHistoryHasToolUse({
    tools: options.tools,
    messages: options.messages,
  });

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

  return options;
};
