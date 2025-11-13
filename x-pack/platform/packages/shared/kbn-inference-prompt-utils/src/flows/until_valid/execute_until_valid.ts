/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import {
  MessageRole,
  type Prompt,
  type PromptOptions,
  type ToolCall,
  type ToolCallback,
  type ToolCallbackResult,
  type ToolCallbacksOfToolOptions,
  type ToolChoice,
  type ToolMessage,
  type ToolNamesOf,
  type ToolOptionsOfPrompt,
  type UnboundPromptOptions,
} from '@kbn/inference-common';
import { trace } from '@opentelemetry/api';
import {
  ElasticGenAIAttributes,
  withActiveInferenceSpan,
  withExecuteToolSpan,
} from '@kbn/inference-tracing';
import { omit } from 'lodash';
import type {
  UntilValidPromptOptions,
  UntilValidPromptResponse,
  UntilValidPromptResponseOf,
} from './types';

export function executeUntilValid<
  TPrompt extends Prompt,
  TPromptOptions extends PromptOptions<TPrompt>,
  TToolCallbacks extends ToolCallbacksOfToolOptions<ToolOptionsOfPrompt<TPrompt>>,
  TFinalToolChoice extends ToolChoice<ToolNamesOf<ToolOptionsOfPrompt<TPrompt>>> = ToolChoice<
    ToolNamesOf<ToolOptionsOfPrompt<TPrompt>>
  >
>(
  options: UnboundPromptOptions<TPrompt> &
    UntilValidPromptOptions & { prompt: TPrompt } & {
      toolCallbacks: TToolCallbacks;
      finalToolChoice: TFinalToolChoice;
    }
): Promise<
  UntilValidPromptResponseOf<
    TPrompt,
    TPromptOptions & { toolChoice: TFinalToolChoice },
    TToolCallbacks
  >
>;

/**
 * Executes a prompt, forcing a specific tool call, until the tool call does not return
 * an error. If an error occurs, the LLM receives the error and is asked to retry.
 */
export async function executeUntilValid(
  options: UnboundPromptOptions &
    UntilValidPromptOptions & {
      toolCallbacks: Record<string, ToolCallback>;
      finalToolChoice: ToolChoice;
    }
): Promise<UntilValidPromptResponse> {
  const { inferenceClient, finalToolChoice, maxRetries = 3, toolCallbacks } = options;

  async function callTools(toolCalls: ToolCall[]): Promise<ToolMessage[]> {
    return await Promise.all(
      toolCalls.map(async (toolCall): Promise<ToolMessage> => {
        const callback = toolCallbacks[toolCall.function.name];

        const response = await withExecuteToolSpan(
          toolCall.function.name,
          {
            tool: {
              input: 'arguments' in toolCall.function ? toolCall.function.arguments : undefined,
              toolCallId: toolCall.toolCallId,
            },
          },
          () => callback(toolCall)
        ).catch((error): ToolCallbackResult => {
          trace.getActiveSpan()?.recordException(error);
          return {
            response: { error, data: undefined },
          };
        });

        return {
          response: response.response,
          data: response.data,
          name: toolCall.function.name,
          toolCallId: toolCall.toolCallId,
          role: MessageRole.Tool,
        };
      })
    );
  }

  async function innerCallPromptUntil({
    messages: prevMessages,
    stepsLeft,
    temperature,
  }: {
    messages: Message[];
    stepsLeft: number;
    temperature?: number;
  }): Promise<UntilValidPromptResponse> {
    const nextPrompt = options.prompt;

    const promptOptions = {
      ...omit(options, 'finalToolChoice'),
      prompt: nextPrompt,
    };

    const response = await inferenceClient.prompt({
      ...promptOptions,
      stream: false,
      temperature,
      toolChoice: finalToolChoice,
      prevMessages,
    });

    const toolMessages = response.toolCalls.length
      ? (await callTools(response.toolCalls)).map((toolMessage) => {
          return {
            ...toolMessage,
            response: {
              ...(typeof toolMessage.response === 'string'
                ? { content: toolMessage.response }
                : toolMessage.response),
              stepsLeft,
            },
          };
        })
      : [];

    const errors = toolMessages.flatMap((toolMessage) =>
      'error' in toolMessage.response ? [toolMessage.response.error] : []
    );

    if (errors.length) {
      if (stepsLeft === 0) {
        throw new AggregateError(
          errors,
          `LLM could not complete task successfully in ${maxRetries + 1} attempts`
        );
      }

      return innerCallPromptUntil({
        messages: prevMessages.concat(...toolMessages),
        stepsLeft: stepsLeft - 1,
      });
    }

    const content = response.content;

    return {
      content,
      toolCalls: response.toolCalls,
      tokens: response.tokens,
      input: prevMessages,
    };
  }

  return await withActiveInferenceSpan(
    'UntilValid',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    () =>
      innerCallPromptUntil({
        messages: [],
        stepsLeft: maxRetries + 1,
      })
  );
}
