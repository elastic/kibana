/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskProviderError } from '@kbn/inference-common';
import {
  getConnectorModel,
  isInferenceProviderError,
  type InferenceConnector,
} from '@kbn/inference-common';
import { createSSEInternalError } from '@kbn/sse-utils';

/**
 * Known error message patterns that indicate context length exceeded errors from various LLM providers.
 * This was copied from the convertUpstreamError function in the inference plugin.
 */
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

/**
 * Determines a user-friendly error message based on the error content and status.
 */
function getErrorMessage(message: string, status?: number): string {
  // Check for context length exceeded
  const lowerMessage = message.toLowerCase();
  if (contextLengthMessages.some((pattern) => lowerMessage.includes(pattern))) {
    return 'Context length exceeded - the input is too long for the model';
  }

  // Check status codes
  if (status === 401 || status === 403) {
    return 'Authentication failed - check your API credentials';
  }
  if (status === 429) {
    return 'Rate limit exceeded - too many requests';
  }
  if (status && status >= 500) {
    return 'Service unavailable - the LLM provider is temporarily unavailable';
  }

  return message;
}

export function formatInferenceProviderError(
  error: InferenceTaskProviderError,
  connector: InferenceConnector
): string {
  const model = getConnectorModel(connector);
  const cause = getErrorMessage(error.message, error.meta?.status);

  const lines = [
    `Connector: ${connector.name}`,
    model ? `Model: ${model}` : null,
    `Cause: ${cause}`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Creates a user-friendly SSE error with connector information.
 * Use this in catchError handlers for streaming endpoints that call LLM connectors.
 */
export function createConnectorSSEError(error: Error, connector: InferenceConnector): Error {
  if (isInferenceProviderError(error)) {
    return createSSEInternalError(formatInferenceProviderError(error, connector));
  }

  // For non-provider errors, just return the message
  return createSSEInternalError(error.message);
}
