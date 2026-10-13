/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessageChunk } from '@langchain/core/messages';

type AiPromptMessage = Pick<AIMessageChunk, 'response_metadata' | 'usage_metadata'>;

/**
 * Returns the step output metadata, adding a normalized `usage` block (tokens plus the
 * resolved connector) when the model reported token usage, so the workflow engine can
 * attribute and price each `ai.prompt` call.
 */
export const buildAiPromptOutputMetadata = (
  message: AiPromptMessage,
  connectorId: string
): Record<string, unknown> => {
  const { response_metadata: responseMetadata, usage_metadata: usageMetadata } = message;
  if (!usageMetadata) {
    return responseMetadata;
  }

  const cachedTokens = usageMetadata.input_token_details?.cache_read;
  return {
    ...responseMetadata,
    usage: {
      connectorId,
      inputTokens: usageMetadata.input_tokens,
      outputTokens: usageMetadata.output_tokens,
      ...(cachedTokens !== undefined && { cachedTokens }),
    },
  };
};
