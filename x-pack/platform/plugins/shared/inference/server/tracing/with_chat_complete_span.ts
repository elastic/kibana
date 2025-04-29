/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AssistantMessage,
  ChatCompleteCompositeResponse,
  Message,
  MessageRole,
  ToolCall,
  ToolMessage,
  ToolOptions,
  UserMessage,
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { Span } from '@opentelemetry/api';
import { isObservable, tap } from 'rxjs';
import { isPromise } from 'util/types';
import { withInferenceSpan } from './with_inference_span';
import {
  AssistantMessageEvent,
  ChoiceEvent,
  GenAISemConvAttributes,
  GenAISemanticConventions,
  MessageEvent,
  SystemMessageEvent,
  ToolMessageEvent,
  UserMessageEvent,
} from './types';
import { flattenAttributes } from './util/flatten_attributes';

function addEvent(span: Span, event: MessageEvent) {
  const flattened = flattenAttributes(event.body);
  return span.addEvent(event.name, {
    ...flattened,
    ...event.attributes,
  });
}

function setChoice(span: Span, { content, toolCalls }: { content: string; toolCalls: ToolCall[] }) {
  addEvent(span, {
    name: GenAISemanticConventions.GenAIChoice,
    body: {
      finish_reason: toolCalls.length ? 'tool_calls' : 'stop',
      index: 0,
      message: {
        ...mapAssistantResponse({ content, toolCalls }),
      },
    },
  } satisfies ChoiceEvent);
}

function setTokens(span: Span, { prompt, completion }: { prompt: number; completion: number }) {
  span.setAttributes({
    [GenAISemanticConventions.GenAIUsageInputTokens]: prompt,
    [GenAISemanticConventions.GenAIUsageOutputTokens]: completion,
  } satisfies GenAISemConvAttributes);
}

interface InferenceGenerationOptions {
  provider?: string;
  model?: string;
  system?: string;
  messages: Message[];
}

function getUserMessageEvent(message: UserMessage): UserMessageEvent {
  return {
    name: GenAISemanticConventions.GenAIUserMessage,
    body: {
      content:
        typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      role: 'user',
    },
  };
}

function getAssistantMessageEvent(message: AssistantMessage): AssistantMessageEvent {
  return {
    name: GenAISemanticConventions.GenAIAssistantMessage,
    body: mapAssistantResponse({
      content: message.content,
      toolCalls: message.toolCalls,
    }),
  };
}

function getToolMessageEvent(message: ToolMessage): ToolMessageEvent {
  return {
    name: GenAISemanticConventions.GenAIToolMessage,
    body: {
      role: 'tool',
      id: message.toolCallId,
      content:
        typeof message.response === 'string' ? message.response : JSON.stringify(message.response),
    },
  };
}

function mapAssistantResponse({
  content,
  toolCalls,
}: {
  content?: string | null;
  toolCalls?: ToolCall[];
}) {
  return {
    content: content || null,
    role: 'assistant' as const,
    tool_calls: toolCalls?.map((toolCall) => {
      return {
        function: {
          name: toolCall.function.name,
          arguments: JSON.stringify(
            'arguments' in toolCall.function ? toolCall.function.arguments : {}
          ),
        },
        id: toolCall.toolCallId,
        type: 'function' as const,
      };
    }),
  };
}

/**
 * Wrapper around {@link withInferenceSpan} that sets the right attributes for a chat operation span.
 * @param options
 * @param cb
 */
export function withChatCompleteSpan<T extends ChatCompleteCompositeResponse<ToolOptions, boolean>>(
  options: InferenceGenerationOptions,
  cb: () => T
): T;

export function withChatCompleteSpan(
  options: InferenceGenerationOptions,
  cb: () => ChatCompleteCompositeResponse<ToolOptions, boolean>
): ChatCompleteCompositeResponse<ToolOptions, boolean> {
  const { system, messages, model, provider, ...attributes } = options;

  const next = withInferenceSpan(
    {
      name: 'chatComplete',
      ...attributes,
      [GenAISemanticConventions.GenAIOperationName]: 'chat',
      [GenAISemanticConventions.GenAIResponseModel]: model ?? 'unknown',
      [GenAISemanticConventions.GenAISystem]: provider ?? 'unknown',
    },
    (span) => {
      if (!span) {
        return cb();
      }

      if (system) {
        addEvent(span, {
          name: GenAISemanticConventions.GenAISystemMessage,
          body: {
            content: system,
            role: 'system',
          },
        } satisfies SystemMessageEvent);
      }

      messages
        .map((message) => {
          switch (message.role) {
            case MessageRole.User:
              return getUserMessageEvent(message);

            case MessageRole.Assistant:
              return getAssistantMessageEvent(message);

            case MessageRole.Tool:
              return getToolMessageEvent(message);
          }
        })
        .forEach((event) => {
          addEvent(span, event);
        });

      const result = cb();

      if (isObservable(result)) {
        return result.pipe(
          tap({
            next: (value) => {
              if (isChatCompletionMessageEvent(value)) {
                setChoice(span, {
                  content: value.content,
                  toolCalls: value.toolCalls,
                });
              } else if (isChatCompletionTokenCountEvent(value)) {
                setTokens(span, value.tokens);
              }
            },
          })
        );
      }

      if (isPromise(result)) {
        return result.then((value) => {
          setChoice(span, {
            content: value.content,
            toolCalls: value.toolCalls,
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
