/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskEventBase, InferenceTaskEventType } from './inference_task';

/**
 * Enum for generic inference error codes.
 */
export enum InferenceTaskErrorCode {
  internalError = 'internalError',
  requestError = 'requestError',
  abortedError = 'requestAborted',
}

/**
 * Base class for all inference API errors.
 */
export class InferenceTaskError<
  TCode extends string,
  TMeta extends Record<string, any> | undefined
> extends Error {
  constructor(public code: TCode, message: string, public meta: TMeta) {
    super(message);
  }

  public get status() {
    if (typeof this.meta === 'object' && this.meta.status) {
      return this.meta.status as number;
    }
    return undefined;
  }

  toJSON(): InferenceTaskErrorEvent {
    return {
      type: InferenceTaskEventType.error,
      error: {
        code: this.code,
        message: this.message,
        meta: this.meta,
      },
    };
  }
}

export type InferenceTaskErrorEvent = InferenceTaskEventBase<InferenceTaskEventType.error> & {
  error: {
    code: string;
    message: string;
    meta?: Record<string, any>;
  };
};

/**
 * Inference error thrown when an unexpected internal error occurs while handling the request.
 */
export type InferenceTaskInternalError = InferenceTaskError<
  InferenceTaskErrorCode.internalError,
  Record<string, any>
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
