/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TokenCount as TokenCountType, type Message } from './types';

export enum StreamingChatResponseEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ChatCompletionMessage = 'chatCompletionMessage',
  ConversationCreate = 'conversationCreate',
  ConversationUpdate = 'conversationUpdate',
  MessageAdd = 'messageAdd',
  ChatCompletionError = 'chatCompletionError',
  BufferFlush = 'bufferFlush',
  TokenCount = 'tokenCount',
}

type StreamingChatResponseEventBase<
  TEventType extends StreamingChatResponseEventType,
  TData extends {}
> = {
  type: TEventType;
} & TData;

type BaseChatCompletionEvent<TType extends StreamingChatResponseEventType> =
  StreamingChatResponseEventBase<
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
    }
  >;

export type ChatCompletionChunkEvent =
  BaseChatCompletionEvent<StreamingChatResponseEventType.ChatCompletionChunk>;

export type ChatCompletionMessageEvent =
  BaseChatCompletionEvent<StreamingChatResponseEventType.ChatCompletionMessage>;

export type ConversationCreateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationCreate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
      token_count?: TokenCountType;
    };
  }
>;

export type ConversationUpdateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationUpdate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
      token_count?: TokenCountType;
    };
  }
>;

export type MessageAddEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.MessageAdd,
  { message: Message; id: string }
>;

export type ChatCompletionErrorEvent = StreamingChatResponseEventBase<
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

export type BufferFlushEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.BufferFlush,
  {
    data?: string;
  }
>;

export type TokenCountEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.TokenCount,
  {
    tokens: {
      completion: number;
      prompt: number;
      total: number;
    };
  }
>;

export type StreamingChatResponseEvent =
  | ChatCompletionChunkEvent
  | ChatCompletionMessageEvent
  | ConversationCreateEvent
  | ConversationUpdateEvent
  | MessageAddEvent
  | ChatCompletionErrorEvent
  | TokenCountEvent
  | BufferFlushEvent;

export type StreamingChatResponseEventWithoutError = Exclude<
  StreamingChatResponseEvent,
  ChatCompletionErrorEvent
>;

export type ChatEvent = ChatCompletionChunkEvent | TokenCountEvent | ChatCompletionMessageEvent;
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
    `Function ${name} called but was not available`
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
