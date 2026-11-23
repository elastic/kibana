/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, from } from 'rxjs';
import {
  ChatCompletionEventType,
  InferenceConnectorType,
  type ChatCompleteAPI,
  type ChatCompleteOptions,
  type ChatCompleteResponse,
  type ChatCompletionEvent,
  type ChatCompletionTokenCount,
  type InferenceConnector,
  type ToolCall,
} from '@kbn/inference-common';
import { InferenceChatModel } from '@kbn/inference-langchain';

/** A tool call of a scripted reply: a {@link ToolCall} whose id is given when it matters. */
export type ScriptedToolCall = Omit<ToolCall, 'toolCallId'> & { toolCallId?: string };

/**
 * A scripted reply: a {@link ChatCompleteResponse} with every field optional. A structured output
 * call (`withStructuredOutput`) is answered with a call of the tool the request forces, which is
 * how the inference API carries structured output.
 */
export interface ScriptedReply extends Partial<Omit<ChatCompleteResponse, 'toolCalls' | 'tokens'>> {
  toolCalls?: ScriptedToolCall[];
  tokens?: Partial<ChatCompletionTokenCount>;
}

/** What one call is answered with: a text reply, a reply, or an error the call fails with. */
export type ScriptedResponse = string | Error | ScriptedReply;

/**
 * One call as the inference API received it: the request itself, so `system`, `messages`, `tools`
 * (keyed by name, in binding order) and `toolChoice` read as the provider sees them.
 */
export type ModelCall = ChatCompleteOptions;

export interface ScriptedChatModel {
  chatModel: InferenceChatModel;
  /** Every call made so far, in order. */
  calls: ModelCall[];
  /** Queues responses, consumed one per call. */
  respond: (...responses: ScriptedResponse[]) => void;
}

export const scriptedConnector: InferenceConnector = {
  type: InferenceConnectorType.OpenAI,
  name: 'scripted',
  connectorId: 'scripted-connector',
  config: {},
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

/**
 * A real `InferenceChatModel` over a scripted inference API: `bindTools`, `withConfig`,
 * `withStructuredOutput`, message conversion and token usage are production code, only the
 * `chatComplete` call answers from a script and records what it was asked.
 *
 * A call with no scripted response throws, so a scenario fails as soon as the agent makes a call
 * it did not expect. A streamed call gets its reply as one chunk.
 */
export const createScriptedChatModel = (): ScriptedChatModel => {
  const queue: ScriptedResponse[] = [];
  const calls: ModelCall[] = [];

  const toResponse = (response: string | ScriptedReply): ChatCompleteResponse => {
    const callIndex = calls.length;
    if (typeof response === 'string') {
      return { content: response, toolCalls: [] };
    }
    const { toolCalls = [], tokens, ...rest } = response;
    return {
      ...rest,
      content: response.content ?? '',
      toolCalls: toolCalls.map((toolCall, index) => ({
        ...toolCall,
        toolCallId: toolCall.toolCallId ?? `call-${callIndex}-${index}`,
      })),
      ...(tokens ? { tokens: { prompt: 0, completion: 0, total: 0, ...tokens } } : {}),
    };
  };

  /** A streamed response: the whole reply in one chunk, then its token count. */
  const toEvents = (response: ChatCompleteResponse): ChatCompletionEvent[] => [
    {
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: response.content,
      tool_calls: response.toolCalls.map((toolCall, index) => ({
        index,
        toolCallId: toolCall.toolCallId,
        function: {
          name: toolCall.function.name,
          arguments: JSON.stringify(toolCall.function.arguments),
        },
      })),
    },
    ...(response.tokens
      ? [
          {
            type: ChatCompletionEventType.ChatCompletionTokenCount as const,
            tokens: response.tokens,
          },
        ]
      : []),
  ];

  const answer = (options: ChatCompleteOptions): ChatCompleteResponse => {
    calls.push(options);
    const response = queue.shift();
    if (response === undefined) {
      throw new Error(`Scripted chat model: no response scripted for call ${calls.length}`);
    }
    if (response instanceof Error) {
      throw response;
    }
    return toResponse(response);
  };

  // the two shapes of the inference API: a promise of the response, or a stream of its events
  const chatComplete = (options: ChatCompleteOptions) => {
    if (options.stream) {
      return defer(() => from(toEvents(answer(options))));
    }
    return Promise.resolve().then(() => answer(options));
  };

  const chatModel = new InferenceChatModel({
    connector: scriptedConnector,
    chatComplete: chatComplete as ChatCompleteAPI,
    // a scripted failure is the failure under test, not something to retry
    maxRetries: 0,
  });

  return {
    chatModel,
    calls,
    respond: (...responses) => {
      queue.push(...responses);
    },
  };
};
