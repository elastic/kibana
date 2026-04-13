/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskProviderError } from '@kbn/inference-common';
import { createInferenceProviderError } from '@kbn/inference-common';
import type { ChatCompletionContextLengthExceededError } from '@kbn/inference-common/src/chat_complete/errors';
import { createContextLengthExceededError } from '../../../common/chat_complete/errors';

const connectorStatusCodeRegexp = /Status code: ([0-9]{3})/i;
const inferenceStatusCodeRegexp = /status \[([0-9]{3})\]/i;

/**
 * Amazon Bedrock Converse (and similar APIs) require each tool's input JSON Schema to be a JSON
 * object at the root (`"type": "object"`). Upstream errors often only say `...type must be ...
 * object`, which is opaque without this context.
 */
const appendToolInputSchemaRootHint = (message: string): string => {
  const lower = message.toLowerCase();
  const looksLikeToolInputSchemaRejection =
    lower.includes('inputschema') &&
    (lower.includes('toolspec') || lower.includes('toolconfig.tools'));
  const mentionsRootObjectRequirement =
    lower.includes('must be one of the following: object') ||
    lower.includes('must be of type object');

  if (!looksLikeToolInputSchemaRejection || !mentionsRootObjectRequirement) {
    return message;
  }

  return `${message} Additional context: a tool definition was rejected because its parameter JSON Schema must declare a root JSON object (typically \`{"type":"object","properties":{...}}\`). This often happens when a schema is produced from Zod \`discriminatedUnion\` / \`union\`, \`intersection\` (serializing to top-level \`oneOf\` / \`allOf\`), or other shapes that omit a top-level \`"type":"object"\`. Fix by exposing tool parameters as one plain object (merge fields under a single \`properties\` map, split into separate tools, or normalize the schema before sending it to the model provider), then retry.`;
};

export const convertUpstreamError = (
  source: string | Error,
  { statusCode, messagePrefix }: { statusCode?: number; messagePrefix?: string } = {}
): InferenceTaskProviderError | ChatCompletionContextLengthExceededError => {
  const message = appendToolInputSchemaRootHint(
    typeof source === 'string' ? source : source.message
  );

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
