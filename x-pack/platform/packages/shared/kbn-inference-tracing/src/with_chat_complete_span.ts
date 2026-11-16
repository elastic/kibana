/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AssistantMessage,
  ChatCompleteCacheControl,
  ChatCompleteCompositeResponse,
  ChatCompletionReasoning,
  Message,
  Model,
  ToolCall,
  ToolChoice,
  ToolDefinition,
  ToolMessage,
  UnvalidatedToolCall,
  UserMessage,
} from '@kbn/inference-common';
import {
  MessageRole,
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import type { Span } from '@opentelemetry/api';
import { SpanKind } from '@opentelemetry/api';
import { isObservable, tap } from 'rxjs';
import { isPromise } from 'util/types';
import { withActiveInferenceSpan } from './with_active_inference_span';
import { getGenAiToolDefinitions } from './gen_ai_tool_definitions';
import type {
  GenAIInputMessage,
  GenAIMessagePart,
  GenAIOutputMessage,
  GenAISemConvAttributes,
  GenAITextPart,
} from './types';
import { ElasticGenAIAttributes, GenAISemanticConventions } from './types';

function buildInputMessages(messages: Message[]): GenAIInputMessage[] {
  return messages.map((message) => {
    switch (message.role) {
      case MessageRole.User:
        return buildUserInputMessage(message);
      case MessageRole.Assistant:
        return buildAssistantInputMessage(message);
      case MessageRole.Tool:
        return buildToolInputMessage(message);
    }
  });
}

function buildUserInputMessage(message: UserMessage): GenAIInputMessage {
  const content =
    typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
  return {
    role: 'user',
    parts: [{ type: 'text', content }],
  };
}

function buildAssistantInputMessage(message: AssistantMessage): GenAIInputMessage {
  const parts: GenAIMessagePart[] = [];
  if (message.content) {
    parts.push({ type: 'text', content: message.content });
  }
  if (message.toolCalls) {
    for (const toolCall of message.toolCalls) {
      parts.push({
        type: 'tool_call',
        id: toolCall.toolCallId,
        name: toolCall.function.name,
        arguments:
          typeof toolCall.function.arguments === 'string'
            ? toolCall.function.arguments
            : JSON.stringify(toolCall.function.arguments),
      });
    }
  }
  return { role: 'assistant', parts };
}

function buildToolInputMessage(message: ToolMessage): GenAIInputMessage {
  const response =
    typeof message.response === 'string' ? message.response : JSON.stringify(message.response);
  return {
    role: 'tool',
    parts: [{ type: 'tool_call_response', id: message.toolCallId, response }],
  };
}

function buildSystemInstructions(system: string): GenAITextPart[] {
  return [{ type: 'text', content: system }];
}

function buildOutputMessages({
  content,
  toolCalls,
  finishReason,
}: {
  content: string;
  toolCalls: Array<ToolCall> | Array<UnvalidatedToolCall>;
  finishReason?: string;
}): GenAIOutputMessage[] {
  const parts: GenAIMessagePart[] = [];
  if (content) {
    parts.push({ type: 'text', content });
  }
  for (const toolCall of toolCalls) {
    parts.push({
      type: 'tool_call',
      id: toolCall.toolCallId,
      name: toolCall.function.name,
      arguments:
        typeof toolCall.function.arguments === 'string'
          ? toolCall.function.arguments
          : JSON.stringify(toolCall.function.arguments),
    });
  }
  return [
    {
      role: 'assistant',
      // Tool calls always normalize to `tool_calls` (providers report `tool_use`, or `stop`
      // under simulated function calling); otherwise prefer the provider reason (e.g. `content_filter`).
      finish_reason: toolCalls.length ? 'tool_calls' : finishReason ?? 'stop',
      parts,
    },
  ];
}

function setOutputMessages(
  span: Span,
  {
    content,
    toolCalls,
    finishReason,
  }: {
    content: string;
    toolCalls: Array<ToolCall> | Array<UnvalidatedToolCall>;
    finishReason?: string;
  }
) {
  if (!span.isRecording()) {
    return;
  }
  span.setAttribute(
    GenAISemanticConventions.GenAIOutputMessages,
    JSON.stringify(buildOutputMessages({ content, toolCalls, finishReason }))
  );
}

function setTokens(
  span: Span,
  {
    prompt,
    completion,
    cached,
    cacheWrite,
  }: { prompt: number; completion: number; cached?: number; cacheWrite?: number }
) {
  if (!span.isRecording()) {
    return;
  }
  const attributes: Record<string, number> = {
    [GenAISemanticConventions.GenAIUsageInputTokens]: prompt,
    [GenAISemanticConventions.GenAIUsageOutputTokens]: completion,
  };
  if (cached != null) {
    attributes[GenAISemanticConventions.GenAIUsageCacheReadInputTokens] = cached;
  }
  if (cacheWrite != null) {
    attributes[GenAISemanticConventions.GenAIUsageCacheWriteInputTokens] = cacheWrite;
  }
  span.setAttributes(attributes);
}

function setResponseModel(span: Span, { modelName }: { modelName?: string }) {
  if (!span.isRecording()) {
    return;
  }
  span.setAttributes({
    [GenAISemanticConventions.GenAIResponseModel]: modelName ?? 'unknown',
  } satisfies GenAISemConvAttributes);
}

interface InferenceGenerationOptions {
  model?: Model;
  system?: string;
  messages: Message[];
  tools?: Record<string, ToolDefinition>;
  toolChoice?: ToolChoice;
  cacheControl?: ChatCompleteCacheControl;
  sessionId?: string;
  reasoning?: ChatCompletionReasoning;
}

/**
 * Wrapper around {@link withActiveInferenceSpan} that sets the right attributes for a chat operation span.
 * @param options
 * @param cb
 */
export function withChatCompleteSpan<T extends ChatCompleteCompositeResponse>(
  options: InferenceGenerationOptions,
  cb: (span?: Span) => T
): T;

export function withChatCompleteSpan(
  options: InferenceGenerationOptions,
  cb: (span?: Span) => ChatCompleteCompositeResponse
): ChatCompleteCompositeResponse {
  const {
    system,
    messages,
    model,
    toolChoice,
    tools,
    cacheControl,
    sessionId,
    reasoning,
    ...attributes
  } = options;

  const modelProvider = model?.provider ?? 'unknown';
  const modelId = model?.id ?? model?.family ?? 'unknown';

  const next = withActiveInferenceSpan(
    `chat ${modelId}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        ...attributes,
        [GenAISemanticConventions.GenAIOperationName]: 'chat',
        [GenAISemanticConventions.GenAIRequestModel]: modelId,
        [GenAISemanticConventions.GenAIProviderName]: modelProvider,
        [ElasticGenAIAttributes.InferenceSpanKind]: 'LLM',
        [GenAISemanticConventions.GenAIToolDefinitions]: tools
          ? JSON.stringify(getGenAiToolDefinitions(tools))
          : undefined,
        [ElasticGenAIAttributes.ToolChoice]: toolChoice ? JSON.stringify(toolChoice) : toolChoice,
        ...(cacheControl
          ? {
              [ElasticGenAIAttributes.CacheControlType]: cacheControl.type,
              [ElasticGenAIAttributes.CacheControlTTL]: cacheControl.ttl
                ? cacheControl.ttl
                : undefined,
            }
          : {}),
        ...(sessionId ? { [ElasticGenAIAttributes.CacheControlSessionId]: sessionId } : {}),
        ...(reasoning?.effort
          ? { [GenAISemanticConventions.GenAIRequestReasoningLevel]: reasoning.effort }
          : {}),
      },
    },
    (span) => {
      if (!span) {
        return cb();
      }

      if (system) {
        span.setAttribute(
          GenAISemanticConventions.GenAISystemInstructions,
          JSON.stringify(buildSystemInstructions(system))
        );
      }

      span.setAttribute(
        GenAISemanticConventions.GenAIInputMessages,
        JSON.stringify(buildInputMessages(messages))
      );

      const result = cb(span);

      if (isObservable(result)) {
        return result.pipe(
          tap({
            next: (value) => {
              if (isChatCompletionMessageEvent(value)) {
                setOutputMessages(span, {
                  content: value.content,
                  toolCalls: value.toolCalls,
                  finishReason: value.finish_reason,
                });
              } else if (isChatCompletionTokenCountEvent(value)) {
                setTokens(span, value.tokens);
                setResponseModel(span, { modelName: value.model });
              }
            },
          })
        );
      }

      if (isPromise(result)) {
        return result.then((value) => {
          setOutputMessages(span, {
            content: value.content,
            toolCalls: value.toolCalls,
            finishReason: value.finish_reason,
          });
          if (value.tokens) {
            setTokens(span, value.tokens);
          }

          return value;
        });
      }

      return result;
    }
  );

  return next;
}
