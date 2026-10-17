/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import type { Message } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { OpenAIAssistantMessageParamWithReasoning, OpenAIRequest } from '../openai/types';
import { wrapWithSimulatedFunctionCalling } from '../../simulated_function_calling';
import { messagesToOpenAI, toolChoiceToOpenAI, toolsToOpenAI } from '../openai';
import type { CreateOpenAIRequestOptions } from './types';
import { applyProviderTransforms } from './providers';
import { getTemperatureIfValid } from '../../utils/get_temperature';
import { resolveChatCompletionReasoning } from '../../utils/resolve_chat_completion_reasoning';
import { getModelId } from './utils';

/**
 * Replays `reasoning` recorded on assistant messages back onto the outgoing ES
 * unified chat completion request. Assistant turns without reasoning are left
 * untouched, so providers that never returned reasoning see identical requests.
 */
export const withAssistantReasoning = (
  openAiMessages: OpenAI.ChatCompletionCreateParams['messages'],
  messages: Message[]
): OpenAI.ChatCompletionCreateParams['messages'] => {
  if (!messages.some((message) => message.role === MessageRole.Assistant && message.reasoning)) {
    return openAiMessages;
  }

  // messagesToOpenAI maps inference messages onto OpenAI params one-to-one by role,
  // so the n-th assistant param corresponds to the n-th assistant input message.
  const assistantMessages = messages.filter((m) => m.role === MessageRole.Assistant);
  let assistantIndex = -1;
  return openAiMessages.map((message) => {
    if (message.role !== 'assistant') {
      return message;
    }
    assistantIndex++;
    const reasoning = assistantMessages[assistantIndex]?.reasoning;
    if (!reasoning) {
      return message;
    }
    const withReasoning = message as OpenAIAssistantMessageParamWithReasoning;
    return { ...withReasoning, reasoning };
  });
};

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

  // Preconfigured EIS connectors carry no model_id, so fall back to the inference endpoint id.
  const model = modelName ?? getModelId(options.connector) ?? options.connector.config?.inferenceId;

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
      model,
    });
    request = {
      ...getTemperatureIfValid(temperature, { connector: options.connector, modelName }),
      model: modelName,
      messages: withAssistantReasoning(
        messagesToOpenAI({ system: wrapped.system, messages: wrapped.messages }),
        wrapped.messages
      ),
      ...(resolvedReasoning ? { reasoning: resolvedReasoning } : {}),
    };
  } else {
    const openAiTools = toolsToOpenAI(tools);
    const hasTools = Array.isArray(openAiTools) && openAiTools.length > 0;
    const resolvedReasoning = resolveChatCompletionReasoning({
      reasoning,
      hasNativeTools: hasTools,
      model,
    });

    request = {
      ...getTemperatureIfValid(temperature, { connector: options.connector, modelName }),
      model: modelName,
      messages: withAssistantReasoning(messagesToOpenAI({ system, messages }), messages),
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
