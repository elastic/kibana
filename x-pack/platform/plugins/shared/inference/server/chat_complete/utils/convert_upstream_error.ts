/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskProviderError } from '@kbn/inference-common';
import { createInferenceProviderError } from '@kbn/inference-common';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { ChatCompletionContextLengthExceededError } from '@kbn/inference-common/src/chat_complete/errors';
import type { DecoratedError } from '@kbn/task-manager-plugin/server';
import { createContextLengthExceededError } from '../../../common/chat_complete/errors';

const connectorStatusCodeRegexp = /Status code: ([0-9]{3})/i;
const inferenceStatusCodeRegexp = /status \[([0-9]{3})\]/i;
/**
 * Checks for 429 error due to user exceeding their quota and creates and throws a user error if appropriate.
 * This is a temporary measure until the backend is updated to return the original error code instead of a general 400 or 500 (https://github.com/elastic/elasticsearch/issues/139710).
 */
const isUserError = (source: string | Error) =>
  typeof source === 'string' && source.includes('status [429]') && source.includes('quota');

export const convertUpstreamError = (
  source: string | Error,
  { statusCode, messagePrefix }: { statusCode?: number; messagePrefix?: string } = {}
): InferenceTaskProviderError | ChatCompletionContextLengthExceededError | DecoratedError => {
  const message = typeof source === 'string' ? source : source.message;

  let status = statusCode;
  if (!status && typeof source === 'object') {
    status = (source as any).status ?? (source as any).response?.status;
  }
  if (!status) {
    const match = connectorStatusCodeRegexp.exec(message);
    if (match) {
      status = parseInt(match[1], 10);
    }
  }
  if (!status) {
    const match = inferenceStatusCodeRegexp.exec(message);
    if (match) {
      status = parseInt(match[1], 10);
    }
  }

  const messageWithPrefix = messagePrefix ? `${messagePrefix} ${message}` : message;

  if (isTooManyTokensError(message)) {
    return createContextLengthExceededError({ message });
  }

  if (isUserError(source)) {
    return createTaskRunError(new Error(source as string), TaskErrorSource.USER);
  }

  return createInferenceProviderError(messageWithPrefix, { status });
};

const contextLengthMessages = [
  // openAI
  // “This model’s maximum context length is 4097 tokens, however you requested 5360 tokens (1360 in your prompt; 4000 for the completion)"
  'maximum context length',
  // bedrock
  // "Input is too long for requested model"
  'input is too long',
  // anthropic
  // “input length and max_tokens exceed context limit: 199926 + 21333 > 200000, decrease input length or max_tokens and try again”
  'exceed context limit',
  // gemini
  // The input token count (1125602) exceeds the maximum number of tokens allowed (1048576)
  'exceeds the maximum number of tokens allowed',
  // Cohere
  'too many tokens',
  // TogetherAI
  'input token count',
  // EIS in dev mode
  'request_entity_too_large',
];

export const isTooManyTokensError = (message: string): boolean => {
  return contextLengthMessages.some((m) => message.toLowerCase().includes(m.toLowerCase()));
};
