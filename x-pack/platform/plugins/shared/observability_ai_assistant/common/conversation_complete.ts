/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ServerSentEventBase } from '@kbn/sse-utils';
import { DeanonymizationInput, DeanonymizationOutput, type Message } from './types';

export enum StreamingChatResponseEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ChatCompletionMessage = 'chatCompletionMessage',
  ConversationCreate = 'conversationCreate',
  ConversationUpdate = 'conversationUpdate',
  MessageAdd = 'messageAdd',
  ChatCompletionError = 'chatCompletionError',
  BufferFlush = 'bufferFlush',
}

type BaseChatCompletionEvent<TType extends StreamingChatResponseEventType> = ServerSentEventBase<
  TType,
  {
    id: string;
    message: {
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    deanonymized_input?: DeanonymizationInput;
    deanonymized_output?: DeanonymizationOutput;
  }
>;

export type ChatCompletionChunkEvent =
  BaseChatCompletionEvent<StreamingChatResponseEventType.ChatCompletionChunk>;

export type ChatCompletionMessageEvent =
  BaseChatCompletionEvent<StreamingChatResponseEventType.ChatCompletionMessage>;

export type ConversationCreateEvent = ServerSentEventBase<
  StreamingChatResponseEventType.ConversationCreate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
    };
  }
>;

export type ConversationUpdateEvent = ServerSentEventBase<
  StreamingChatResponseEventType.ConversationUpdate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
    };
  }
>;

export type MessageAddEvent = ServerSentEventBase<
  StreamingChatResponseEventType.MessageAdd,
  { message: Message; id: string }
> & {
  deanonymized_input?: DeanonymizationInput;
  deanonymized_output?: DeanonymizationOutput;
};

export type ChatCompletionErrorEvent = ServerSentEventBase<
  StreamingChatResponseEventType.ChatCompletionError,
  {
    error: {
      message: string;
      stack?: string;
      code?: ChatCompletionErrorCode;
      meta?: Record<string, any>;
    };
  }
>;

export type BufferFlushEvent = ServerSentEventBase<
  StreamingChatResponseEventType.BufferFlush,
  {
    data?: string;
  }
>;

export type StreamingChatResponseEvent =
  | ChatCompletionChunkEvent
  | ChatCompletionMessageEvent
  | ConversationCreateEvent
  | ConversationUpdateEvent
  | MessageAddEvent
  | ChatCompletionErrorEvent
  | BufferFlushEvent;

export type StreamingChatResponseEventWithoutError = Exclude<
  StreamingChatResponseEvent,
  ChatCompletionErrorEvent
>;

export type ChatEvent = ChatCompletionChunkEvent | ChatCompletionMessageEvent;
export type MessageOrChatEvent = ChatEvent | MessageAddEvent;

export enum ChatCompletionErrorCode {
  InternalError = 'internalError',
  NotFoundError = 'notFoundError',
  TokenLimitReachedError = 'tokenLimitReachedError',
  FunctionNotFoundError = 'functionNotFoundError',
  FunctionLimitExceededError = 'functionLimitExceededError',
}

interface ErrorMetaAttributes {
  [ChatCompletionErrorCode.InternalError]: {};
  [ChatCompletionErrorCode.NotFoundError]: {};
  [ChatCompletionErrorCode.TokenLimitReachedError]: {
    tokenLimit?: number;
    tokenCount?: number;
  };
  [ChatCompletionErrorCode.FunctionNotFoundError]: {
    name: string;
  };
  [ChatCompletionErrorCode.FunctionLimitExceededError]: {};
}

export class ChatCompletionError<T extends ChatCompletionErrorCode> extends Error {
  constructor(
    public code: T,
    message: string,
    public meta: ErrorMetaAttributes[T] = {} as ErrorMetaAttributes[T]
  ) {
    super(message);
  }
}

export function createTokenLimitReachedError(tokenLimit?: number, tokenCount?: number) {
  return new ChatCompletionError(
    ChatCompletionErrorCode.TokenLimitReachedError,
    i18n.translate('xpack.observabilityAiAssistant.chatCompletionError.tokenLimitReachedError', {
      defaultMessage: `Token limit reached. Token limit is {tokenLimit}, but the current conversation has {tokenCount} tokens.`,
      values: { tokenLimit, tokenCount },
    }),
    { tokenLimit, tokenCount }
  );
}

export function createConversationNotFoundError() {
  return new ChatCompletionError(
    ChatCompletionErrorCode.NotFoundError,
    i18n.translate('xpack.observabilityAiAssistant.chatCompletionError.conversationNotFoundError', {
      defaultMessage: 'Conversation not found',
    })
  );
}

export function createInternalServerError(
  originalErrorMessage: string = i18n.translate(
    'xpack.observabilityAiAssistant.chatCompletionError.internalServerError',
    {
      defaultMessage: 'An internal server error occurred',
    }
  )
) {
  return new ChatCompletionError(ChatCompletionErrorCode.InternalError, originalErrorMessage);
}

export function createFunctionNotFoundError(name: string) {
  return new ChatCompletionError(
    ChatCompletionErrorCode.FunctionNotFoundError,
    `Function "${name}" called but was not available`
  );
}

export function createFunctionLimitExceededError() {
  return new ChatCompletionError(
    ChatCompletionErrorCode.FunctionLimitExceededError,
    `Function limit exceeded`
  );
}

export function isTokenLimitReachedError(
  error: Error
): error is ChatCompletionError<ChatCompletionErrorCode.TokenLimitReachedError> {
  return (
    error instanceof ChatCompletionError &&
    error.code === ChatCompletionErrorCode.TokenLimitReachedError
  );
}

export function isFunctionNotFoundError(
  error: Error
): error is ChatCompletionError<ChatCompletionErrorCode.FunctionNotFoundError> {
  return (
    error instanceof ChatCompletionError &&
    error.code === ChatCompletionErrorCode.FunctionNotFoundError
  );
}

export function isChatCompletionError(error: Error): error is ChatCompletionError<any> {
  return error instanceof ChatCompletionError;
}
