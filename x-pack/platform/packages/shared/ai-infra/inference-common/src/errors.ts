/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerSentEventError } from '@kbn/sse-utils';
import { InferenceTaskEventBase, InferenceTaskEventType } from './inference_task';

/**
 * Enum for generic inference error codes.
 */
export enum InferenceTaskErrorCode {
  providerError = 'providerError',
  internalError = 'internalError',
  requestError = 'requestError',
  abortedError = 'requestAborted',
}

const InferenceTaskError = ServerSentEventError;
type InferenceTaskError<
  TCode extends string,
  TMeta extends Record<string, any> | undefined
> = ServerSentEventError<TCode, TMeta>;

export type InferenceTaskErrorEvent = InferenceTaskEventBase<
  InferenceTaskEventType.error,
  {
    error: {
      code: string;
      message: string;
      meta?: Record<string, any>;
    };
  }
>;
/**
 * Inference error thrown when an unexpected internal error occurs while handling the request.
 */
export type InferenceTaskInternalError = InferenceTaskError<
  InferenceTaskErrorCode.internalError,
  Record<string, any>
>;

/**
 * Inference error thrown when calling the provider through its connector returned an error.
 *
 * It includes error responses returned from the provider,
 * and any potential errors related to connectivity issue.
 */
export type InferenceTaskProviderError = InferenceTaskError<
  InferenceTaskErrorCode.providerError,
  { status?: number }
>;

/**
 * Inference error thrown when the request was considered invalid.
 *
 * Some example of reasons for invalid requests would be:
 * - no connector matching the provided connectorId
 * - invalid connector type for the provided connectorId
 */
export type InferenceTaskRequestError = InferenceTaskError<
  InferenceTaskErrorCode.requestError,
  { status: number }
>;

/**
 * Inference error thrown when the request was aborted.
 *
 * Request abortion occurs when providing an abort signal and firing it
 * before the call to the LLM completes.
 */
export type InferenceTaskAbortedError = InferenceTaskError<
  InferenceTaskErrorCode.abortedError,
  { status: number }
>;

export function createInferenceInternalError(
  message = 'An internal error occurred',
  meta?: Record<string, any>
): InferenceTaskInternalError {
  return new InferenceTaskError(InferenceTaskErrorCode.internalError, message, meta ?? {});
}

export function createInferenceProviderError(
  message = 'An internal error occurred',
  meta?: { status?: number }
): InferenceTaskProviderError {
  return new InferenceTaskError(InferenceTaskErrorCode.providerError, message, meta ?? {});
}

export function createInferenceRequestError(
  message: string,
  status: number
): InferenceTaskRequestError {
  return new InferenceTaskError(InferenceTaskErrorCode.requestError, message, {
    status,
  });
}

export function createInferenceRequestAbortedError(): InferenceTaskAbortedError {
  return new InferenceTaskError(InferenceTaskErrorCode.abortedError, 'Request was aborted', {
    status: 499,
  });
}

/**
 * Check if the given error is an {@link InferenceTaskError}
 */
export function isInferenceError(
  error: unknown
): error is InferenceTaskError<string, Record<string, any> | undefined> {
  return error instanceof InferenceTaskError;
}

/**
 * Check if the given error is an {@link InferenceTaskInternalError}
 */
export function isInferenceInternalError(error: unknown): error is InferenceTaskInternalError {
  return isInferenceError(error) && error.code === InferenceTaskErrorCode.internalError;
}

/**
 * Check if the given error is an {@link InferenceTaskRequestError}
 */
export function isInferenceRequestError(error: unknown): error is InferenceTaskRequestError {
  return isInferenceError(error) && error.code === InferenceTaskErrorCode.requestError;
}

/**
 * Check if the given error is an {@link InferenceTaskAbortedError}
 */
export function isInferenceRequestAbortedError(error: unknown): error is InferenceTaskAbortedError {
  return isInferenceError(error) && error.code === InferenceTaskErrorCode.abortedError;
}

/**
 * Check if the given error is an {@link InferenceTaskProviderError}
 */
export function isInferenceProviderError(error: unknown): error is InferenceTaskProviderError {
  return isInferenceError(error) && error.code === InferenceTaskErrorCode.providerError;
}

export { InferenceTaskError };
