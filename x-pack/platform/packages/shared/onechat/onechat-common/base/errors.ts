/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerSentEventError } from '@kbn/sse-utils';

/**
 * Code to identify onechat errors
 */
export enum OnechatErrorCode {
  internalError = 'internalError',
  badRequest = 'badRequest',
  toolNotFound = 'toolNotFound',
  agentNotFound = 'agentNotFound',
  conversationNotFound = 'conversationNotFound',
}

const OnechatError = ServerSentEventError;

/**
 * Base error class used for all onechat errors.
 */
export type OnechatError<
  TCode extends OnechatErrorCode,
  TMeta extends Record<string, any> = Record<string, any>
> = ServerSentEventError<TCode, TMeta>;

export const isOnechatError = (err: unknown): err is OnechatError<OnechatErrorCode> => {
  return err instanceof OnechatError;
};

export const createOnechatError = (
  errorCode: OnechatErrorCode,
  message: string,
  meta?: Record<string, any>
): OnechatError<OnechatErrorCode> => {
  return new OnechatError(errorCode, message, meta ?? {});
};

/**
 * Represents an internal error
 */
export type OnechatInternalError = OnechatError<OnechatErrorCode.internalError>;

/**
 * Checks if the given error is a {@link OnechatInternalError}
 */
export const isInternalError = (err: unknown): err is OnechatInternalError => {
  return isOnechatError(err) && err.code === OnechatErrorCode.internalError;
};

export const createInternalError = (
  message: string,
  meta?: Record<string, any>
): OnechatInternalError => {
  return new OnechatError(OnechatErrorCode.internalError, message, meta ?? {});
};

/**
 * Represents a generic bad request error
 */
export type OnechatBadRequestError = OnechatError<OnechatErrorCode.badRequest>;

/**
 * Checks if the given error is a {@link OnechatInternalError}
 */
export const isBadRequestError = (err: unknown): err is OnechatBadRequestError => {
  return isOnechatError(err) && err.code === OnechatErrorCode.badRequest;
};

export const createBadRequestError = (
  message: string,
  meta: Record<string, any> = {}
): OnechatBadRequestError => {
  return new OnechatError(OnechatErrorCode.badRequest, message, { ...meta, statusCode: 400 });
};

/**
 * Error thrown when trying to retrieve or execute a tool not present or available in the current context.
 */
export type OnechatToolNotFoundError = OnechatError<OnechatErrorCode.toolNotFound>;

/**
 * Checks if the given error is a {@link OnechatToolNotFoundError}
 */
export const isToolNotFoundError = (err: unknown): err is OnechatToolNotFoundError => {
  return isOnechatError(err) && err.code === OnechatErrorCode.toolNotFound;
};

export const createToolNotFoundError = ({
  toolId,
  toolType,
  customMessage,
  meta = {},
}: {
  toolId: string;
  toolType?: string;
  customMessage?: string;
  meta?: Record<string, any>;
}): OnechatToolNotFoundError => {
  return new OnechatError(
    OnechatErrorCode.toolNotFound,
    customMessage ?? `Tool ${toolId} not found`,
    { ...meta, toolId, statusCode: 404 }
  );
};

/**
 * Error thrown when trying to retrieve or execute a tool not present or available in the current context.
 */
export type OnechatAgentNotFoundError = OnechatError<OnechatErrorCode.agentNotFound>;

/**
 * Checks if the given error is a {@link OnechatInternalError}
 */
export const isAgentNotFoundError = (err: unknown): err is OnechatAgentNotFoundError => {
  return isOnechatError(err) && err.code === OnechatErrorCode.agentNotFound;
};

export const createAgentNotFoundError = ({
  agentId,
  customMessage,
  meta = {},
}: {
  agentId: string;
  customMessage?: string;
  meta?: Record<string, any>;
}): OnechatAgentNotFoundError => {
  return new OnechatError(
    OnechatErrorCode.agentNotFound,
    customMessage ?? `Agent ${agentId} not found`,
    { ...meta, agentId, statusCode: 404 }
  );
};

/**
 * Error thrown when trying to retrieve or execute a tool not present or available in the current context.
 */
export type OnechatConversationNotFoundError = OnechatError<OnechatErrorCode.conversationNotFound>;

/**
 * Checks if the given error is a {@link OnechatConversationNotFoundError}
 */
export const isConversationNotFoundError = (
  err: unknown
): err is OnechatConversationNotFoundError => {
  return isOnechatError(err) && err.code === OnechatErrorCode.conversationNotFound;
};

export const createConversationNotFoundError = ({
  conversationId,
  customMessage,
  meta = {},
}: {
  conversationId: string;
  customMessage?: string;
  meta?: Record<string, any>;
}): OnechatConversationNotFoundError => {
  return new OnechatError(
    OnechatErrorCode.conversationNotFound,
    customMessage ?? `Conversation ${conversationId} not found`,
    { ...meta, conversationId, statusCode: 404 }
  );
};

/**
 * Global utility exposing all error utilities from a single export.
 */
export const OnechatErrorUtils = {
  isOnechatError,
  isInternalError,
  isToolNotFoundError,
  isAgentNotFoundError,
  isConversationNotFoundError,
  createInternalError,
  createToolNotFoundError,
  createAgentNotFoundError,
  createConversationNotFoundError,
};
