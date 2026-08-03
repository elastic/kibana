import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { DeanonymizationInput, DeanonymizationOutput } from './types';
import { type Message } from './types';
export declare enum StreamingChatResponseEventType {
    ChatCompletionChunk = "chatCompletionChunk",
    ChatCompletionMessage = "chatCompletionMessage",
    ConversationCreate = "conversationCreate",
    ConversationUpdate = "conversationUpdate",
    MessageAdd = "messageAdd",
    ChatCompletionError = "chatCompletionError",
    BufferFlush = "bufferFlush"
}
type BaseChatCompletionEvent<TType extends StreamingChatResponseEventType> = ServerSentEventBase<TType, {
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
}>;
export type ChatCompletionChunkEvent = BaseChatCompletionEvent<StreamingChatResponseEventType.ChatCompletionChunk>;
export type ChatCompletionMessageEvent = BaseChatCompletionEvent<StreamingChatResponseEventType.ChatCompletionMessage>;
export type ConversationCreateEvent = ServerSentEventBase<StreamingChatResponseEventType.ConversationCreate, {
    conversation: {
        id: string;
        title: string;
        last_updated: string;
    };
}>;
export type ConversationUpdateEvent = ServerSentEventBase<StreamingChatResponseEventType.ConversationUpdate, {
    conversation: {
        id: string;
        title: string;
        last_updated: string;
    };
}>;
export type MessageAddEvent = ServerSentEventBase<StreamingChatResponseEventType.MessageAdd, {
    message: Message;
    id: string;
}> & {
    deanonymized_input?: DeanonymizationInput;
    deanonymized_output?: DeanonymizationOutput;
};
export type ChatCompletionErrorEvent = ServerSentEventBase<StreamingChatResponseEventType.ChatCompletionError, {
    error: {
        message: string;
        stack?: string;
        code?: ChatCompletionErrorCode;
        meta?: Record<string, any>;
    };
}>;
export type BufferFlushEvent = ServerSentEventBase<StreamingChatResponseEventType.BufferFlush, {
    data?: string;
}>;
export type StreamingChatResponseEvent = ChatCompletionChunkEvent | ChatCompletionMessageEvent | ConversationCreateEvent | ConversationUpdateEvent | MessageAddEvent | ChatCompletionErrorEvent | BufferFlushEvent;
export type StreamingChatResponseEventWithoutError = Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>;
export type ChatEvent = ChatCompletionChunkEvent | ChatCompletionMessageEvent;
export type MessageOrChatEvent = ChatEvent | MessageAddEvent;
export declare enum ChatCompletionErrorCode {
    InternalError = "internalError",
    NotFoundError = "notFoundError",
    TokenLimitReachedError = "tokenLimitReachedError",
    FunctionLimitExceededError = "functionLimitExceededError"
}
interface ErrorMetaAttributes {
    [ChatCompletionErrorCode.InternalError]: {};
    [ChatCompletionErrorCode.NotFoundError]: {};
    [ChatCompletionErrorCode.TokenLimitReachedError]: {
        tokenLimit?: number;
        tokenCount?: number;
    };
    [ChatCompletionErrorCode.FunctionLimitExceededError]: {};
}
export declare class ChatCompletionError<T extends ChatCompletionErrorCode> extends Error {
    code: T;
    meta: ErrorMetaAttributes[T];
    constructor(code: T, message: string, meta?: ErrorMetaAttributes[T]);
}
export declare function createTokenLimitReachedError(tokenLimit?: number, tokenCount?: number): ChatCompletionError<ChatCompletionErrorCode.TokenLimitReachedError>;
export declare function createConversationNotFoundError(): ChatCompletionError<ChatCompletionErrorCode.NotFoundError>;
export declare function createInternalServerError(originalErrorMessage?: string): ChatCompletionError<ChatCompletionErrorCode.InternalError>;
export declare function createFunctionLimitExceededError(): ChatCompletionError<ChatCompletionErrorCode.FunctionLimitExceededError>;
export declare function isTokenLimitReachedError(error: Error): error is ChatCompletionError<ChatCompletionErrorCode.TokenLimitReachedError>;
export declare function isChatCompletionError(error: Error): error is ChatCompletionError<any>;
export {};
