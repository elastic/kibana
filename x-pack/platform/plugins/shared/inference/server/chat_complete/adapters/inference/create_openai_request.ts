/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapWithSimulatedFunctionCalling } from '../../simulated_function_calling';
import type { OpenAIRequest } from '../openai/types';
import { messagesToOpenAI, toolChoiceToOpenAI, toolsToOpenAI } from '../openai';
import type { CreateOpenAIRequestOptions } from './types';
import { applyProviderTransforms } from './providers';
import { getTemperatureIfValid } from '../../utils/get_temperature';
import { resolveChatCompletionReasoning } from '../../utils/resolve_chat_completion_reasoning';

export const createRequest = (options: CreateOpenAIRequestOptions): OpenAIRequest => {
  const {
    system,
    messages,
    toolChoice,
    tools,
    simulatedFunctionCalling,
    temperature = 0,
    modelName,
    reasoning,
  } = applyProviderTransforms(options);

  let request: OpenAIRequest;
  if (simulatedFunctionCalling) {
    const wrapped = wrapWithSimulatedFunctionCalling({
      system,
      messages,
      toolChoice,
      tools,
    });
    const resolvedReasoning = resolveChatCompletionReasoning({
      reasoning,
      hasNativeTools: false,
    });
    request = {
      ...getTemperatureIfValid(temperature, { connector: options.connector, modelName }),
      model: modelName,
      messages: messagesToOpenAI({ system: wrapped.system, messages: wrapped.messages }),
      ...(resolvedReasoning ? { reasoning: resolvedReasoning } : {}),
    };
  } else {
    const openAiTools = toolsToOpenAI(tools);
    const hasTools = Array.isArray(openAiTools) && openAiTools.length > 0;
    const resolvedReasoning = resolveChatCompletionReasoning({
      reasoning,
      hasNativeTools: hasTools,
    });

    request = {
      ...getTemperatureIfValid(temperature, { connector: options.connector, modelName }),
      model: modelName,
      messages: messagesToOpenAI({ system, messages }),
      ...(hasTools
        ? {
            tool_choice: toolChoiceToOpenAI(toolChoice),
            tools: openAiTools,
          }
        : {}),
      ...(resolvedReasoning ? { reasoning: resolvedReasoning } : {}),
    };
  }

  return request;
};
