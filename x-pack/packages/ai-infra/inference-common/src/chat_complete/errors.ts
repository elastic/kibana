/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskError } from '../errors';
import type { UnvalidatedToolCall } from './tools';

/**
 * List of code of error that are specific to the {@link ChatCompleteAPI}
 */
export enum ChatCompletionErrorCode {
  TokenLimitReachedError = 'tokenLimitReachedError',
  ToolNotFoundError = 'toolNotFoundError',
  ToolValidationError = 'toolValidationError',
}

/**
 * Error thrown if the completion call fails because of a token limit
 * error, e.g. when the context window is higher than the limit
 */
export type ChatCompletionTokenLimitReachedError = InferenceTaskError<
  ChatCompletionErrorCode.TokenLimitReachedError,
  {
    tokenLimit?: number;
    tokenCount?: number;
  }
>;

/**
 * Error thrown if the LLM called a tool that was not provided
 * in the list of available tools.
 */
export type ChatCompletionToolNotFoundError = InferenceTaskError<
  ChatCompletionErrorCode.ToolNotFoundError,
  {
    /** The name of the tool that got called */
    name: string;
  }
>;

/**
 * Error thrown when the LLM called a tool with parameters that
 * don't match the tool's schema.
 *
 * The level of details on the error vary depending on the underlying LLM.
 */
export type ChatCompletionToolValidationError = InferenceTaskError<
  ChatCompletionErrorCode.ToolValidationError,
  {
    name?: string;
    arguments?: string;
    errorsText?: string;
    toolCalls?: UnvalidatedToolCall[];
  }
>;

/**
 * Check if an error is a {@link ChatCompletionToolValidationError}
 */
export function isToolValidationError(error?: Error): error is ChatCompletionToolValidationError {
  return (
    error instanceof InferenceTaskError &&
    error.code === ChatCompletionErrorCode.ToolValidationError
  );
}

/**
 * Check if an error is a {@link ChatCompletionTokenLimitReachedError}
 */
export function isTokenLimitReachedError(
  error: Error
): error is ChatCompletionTokenLimitReachedError {
  return (
    error instanceof InferenceTaskError &&
    error.code === ChatCompletionErrorCode.TokenLimitReachedError
  );
}

/**
 * Check if an error is a {@link ChatCompletionToolNotFoundError}
 */
export function isToolNotFoundError(error: Error): error is ChatCompletionToolNotFoundError {
  return (
    error instanceof InferenceTaskError && error.code === ChatCompletionErrorCode.ToolNotFoundError
  );
}
