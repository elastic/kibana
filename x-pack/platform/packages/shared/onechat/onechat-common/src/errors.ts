/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerSentEventError } from '@kbn/sse-utils';
import type { SerializedToolIdentifier } from './tools';

/**
 * Code to identify onechat errors
 */
export enum OnechatErrorCode {
  internalError = 'internalError',
  toolNotFound = 'toolNotFound',
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
 * Error thrown when trying to retrieve or execute a tool not present or available in the current context.
 */
export type OnechatToolNotFoundError = OnechatError<OnechatErrorCode.toolNotFound>;

/**
 * Checks if the given error is a {@link OnechatInternalError}
 */
export const isToolNotFoundError = (err: unknown): err is OnechatInternalError => {
  return isOnechatError(err) && err.code === OnechatErrorCode.toolNotFound;
};

export const createToolNotFoundError = ({
  toolId,
  customMessage,
  meta = {},
}: {
  toolId: SerializedToolIdentifier;
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
 * Global utility exposing all error utilities from a single export.
 */
export const OnechatErrorUtils = {
  isOnechatError,
  isInternalError,
  isToolNotFoundError,
  createInternalError,
  createToolNotFoundError,
};
