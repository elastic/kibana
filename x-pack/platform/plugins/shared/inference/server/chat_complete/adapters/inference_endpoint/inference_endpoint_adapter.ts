/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, switchMap, identity } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  FunctionCallingMode,
  Message,
  ToolOptions,
  ChatCompleteMetadata,
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  ChatCompletionReasoning,
} from '@kbn/inference-common';
import { eventSourceStreamIntoObservable } from '../../../util/event_source_stream_into_observable';
import {
  processOpenAIStream,
  emitTokenCountEstimateIfMissing,
  messagesToOpenAI,
  toolsToOpenAI,
  toolChoiceToOpenAI,
} from '../openai';
import {
  parseInlineFunctionCalls,
  wrapWithSimulatedFunctionCalling,
} from '../../simulated_function_calling';
import { getTemperatureIfValid } from '../../utils/get_temperature';
import type { InferenceEndpointExecutor } from '../../utils/inference_endpoint_executor';
import { ensureToolsWhenHistoryHasToolUse } from '../../utils/ensure_tools_when_history_has_tool_use';
import type { OpenAIRequest } from '../openai/types';
import { resolveChatCompletionReasoning } from '../../utils/resolve_chat_completion_reasoning';

export interface InferenceEndpointAdapterChatCompleteOptions {
  executor: InferenceEndpointExecutor;
  messages: Message[];
  logger: Logger;
  system?: string;
  functionCalling?: FunctionCallingMode;
  temperature?: number;
  reasoning?: ChatCompletionReasoning;
  modelName?: string;
  // Endpoint model identity is authoritative for parameter support.
  endpointModelId?: string;
  abortSignal?: AbortSignal;
  metadata?: ChatCompleteMetadata;
  stream?: boolean;
  timeout?: number;
  tools?: ToolOptions['tools'];
  toolChoice?: ToolOptions['toolChoice'];
}

export const inferenceEndpointAdapter = {
  chatComplete: (
    options: InferenceEndpointAdapterChatCompleteOptions
  ): Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent> => {
    const {
      executor,
      system,
      messages,
      toolChoice,
      tools,
      functionCalling,
      temperature,
      reasoning,
      modelName,
      endpointModelId,
      logger,
      abortSignal,
      timeout,
      metadata,
    } = options;

    const useSimulatedFunctionCalling = functionCalling === 'simulated';

    const request = createEndpointRequest({
      system,
      messages,
      toolChoice,
      tools,
      simulatedFunctionCalling: useSimulatedFunctionCalling,
      temperature,
      reasoning,
      modelName,
      endpointModelId,
    });

    return defer(() =>
      executor.invoke({
        body: request as unknown as Record<string, unknown>,
        signal: abortSignal,
        metadata,
        timeout,
      })
    ).pipe(
      switchMap((stream) => eventSourceStreamIntoObservable(stream)),
      // Elasticsearch's Anthropic stream emits valid OpenAI-compatible chunks with `object: null`.
      processOpenAIStream({ allowNullObjectWithChoices: true }),
      emitTokenCountEstimateIfMissing({ request }),
      useSimulatedFunctionCalling ? parseInlineFunctionCalls({ logger }) : identity
    );
  },
};

const createEndpointRequest = ({
  system,
  messages,
  toolChoice,
  tools,
  simulatedFunctionCalling,
  temperature,
  reasoning,
  modelName,
  endpointModelId,
}: {
  system?: string;
  messages: Message[];
  toolChoice?: ToolOptions['toolChoice'];
  tools?: ToolOptions['tools'];
  simulatedFunctionCalling: boolean;
  temperature?: number;
  reasoning?: ChatCompletionReasoning;
  modelName?: string;
  endpointModelId?: string;
}): OpenAIRequest => {
  const temperatureOptions = getTemperatureIfValid(temperature, {
    modelId: endpointModelId ?? modelName,
  });

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
    return {
      ...temperatureOptions,
      model: modelName,
      messages: messagesToOpenAI({ system: wrapped.system, messages: wrapped.messages }),
      ...(resolvedReasoning ? { reasoning: resolvedReasoning } : {}),
    };
  }

  const toolsForRequest = ensureToolsWhenHistoryHasToolUse({ tools, messages });
  const openAiTools = toolsToOpenAI(toolsForRequest);
  const hasTools = Array.isArray(openAiTools) && openAiTools.length > 0;
  const resolvedReasoning = resolveChatCompletionReasoning({
    reasoning,
    hasNativeTools: hasTools,
  });

  return {
    ...temperatureOptions,
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
};
