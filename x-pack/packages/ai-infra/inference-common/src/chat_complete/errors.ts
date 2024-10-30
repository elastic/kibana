/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskError } from '../errors';
import type { UnvalidatedToolCall } from './tools';

export enum ChatCompletionErrorCode {
  TokenLimitReachedError = 'tokenLimitReachedError',
  ToolNotFoundError = 'toolNotFoundError',
  ToolValidationError = 'toolValidationError',
}

export type ChatCompletionTokenLimitReachedError = InferenceTaskError<
  ChatCompletionErrorCode.TokenLimitReachedError,
  {
    tokenLimit?: number;
    tokenCount?: number;
  }
>;

export type ChatCompletionToolNotFoundError = InferenceTaskError<
  ChatCompletionErrorCode.ToolNotFoundError,
  {
    name: string;
  }
>;

export type ChatCompletionToolValidationError = InferenceTaskError<
  ChatCompletionErrorCode.ToolValidationError,
  {
    name?: string;
    arguments?: string;
    errorsText?: string;
    toolCalls?: UnvalidatedToolCall[];
  }
>;

export function isToolValidationError(error?: Error): error is ChatCompletionToolValidationError {
  return (
    error instanceof InferenceTaskError &&
    error.code === ChatCompletionErrorCode.ToolValidationError
  );
}

export function isTokenLimitReachedError(
  error: Error
): error is ChatCompletionTokenLimitReachedError {
  return (
    error instanceof InferenceTaskError &&
    error.code === ChatCompletionErrorCode.TokenLimitReachedError
  );
}

export function isToolNotFoundError(error: Error): error is ChatCompletionToolNotFoundError {
  return (
    error instanceof InferenceTaskError && error.code === ChatCompletionErrorCode.ToolNotFoundError
  );
}
