/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapWithSimulatedFunctionCalling } from '../../simulated_function_calling';
import { OpenAIRequest } from '../openai/types';
import { messagesToOpenAI, toolChoiceToOpenAI, toolsToOpenAI } from '../openai';
import type { CreateOpenAIRequestOptions } from './types';
import { applyProviderTransforms } from './providers';

export const createRequest = (options: CreateOpenAIRequestOptions): OpenAIRequest => {
  const {
    system,
    messages,
    toolChoice,
    tools,
    simulatedFunctionCalling,
    temperature = 0,
    modelName,
  } = applyProviderTransforms(options);

  let request: OpenAIRequest;
  if (simulatedFunctionCalling) {
    const wrapped = wrapWithSimulatedFunctionCalling({
      system,
      messages,
      toolChoice,
      tools,
    });
    request = {
      temperature,
      model: modelName,
      messages: messagesToOpenAI({ system: wrapped.system, messages: wrapped.messages }),
    };
  } else {
    request = {
      temperature,
      model: modelName,
      messages: messagesToOpenAI({ system, messages }),
      tool_choice: toolChoiceToOpenAI(toolChoice),
      tools: toolsToOpenAI(tools),
    };
  }

  return request;
};
