/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskError, type UnvalidatedToolCall } from '@kbn/inference-common';
import { i18n } from '@kbn/i18n';
import type {
  ChatCompletionTokenLimitReachedError,
  ChatCompletionToolNotFoundError,
  ChatCompletionToolValidationError,
  ChatCompletionContextLengthExceededError,
} from '@kbn/inference-common/src/chat_complete/errors';
import { ChatCompletionErrorCode } from '@kbn/inference-common/src/chat_complete/errors';

export function createContextLengthExceededError({
  message,
}: {
  message?: string;
}): ChatCompletionContextLengthExceededError {
  return new InferenceTaskError(
    ChatCompletionErrorCode.ContextLengthExceededError,
    message
      ? `The request exceeded the model's maximum context length: ${message}`
      : `The request exceeded the model's maximum context length.`,
    {}
  );
}

export function createTokenLimitReachedError(
  tokenLimit?: number,
  tokenCount?: number
): ChatCompletionTokenLimitReachedError {
  return new InferenceTaskError(
    ChatCompletionErrorCode.OutputTokenLimitReachedError,
    i18n.translate('xpack.inference.chatCompletionError.tokenLimitReachedError', {
      defaultMessage: `Token limit reached. Token limit is {tokenLimit}, but the current conversation has {tokenCount} tokens.`,
      values: { tokenLimit, tokenCount },
    }),
    { tokenLimit, tokenCount }
  );
}

export function createToolNotFoundError({
  name,
  args,
}: {
  name: string;
  args: string;
}): ChatCompletionToolNotFoundError {
  return new InferenceTaskError(
    ChatCompletionErrorCode.ToolNotFoundError,
    `Tool "${name}" called but was not available`,
    {
      name,
      arguments: args,
    }
  );
}

export function createToolValidationError(
  message: string,
  meta: {
    name?: string;
    arguments?: string;
    errorsText?: string;
    toolCalls: UnvalidatedToolCall[];
  }
): ChatCompletionToolValidationError {
  return new InferenceTaskError(ChatCompletionErrorCode.ToolValidationError, message, meta);
}
