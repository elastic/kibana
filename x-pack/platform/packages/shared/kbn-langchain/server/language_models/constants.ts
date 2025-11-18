/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDefaultArguments = (
  llmType?: string,
  temperature?: number,
  stop?: string[],
  maxTokens?: number
) => {
  const baseArgs =
    llmType === 'bedrock'
      ? {
          stopSequences: stop ?? DEFAULT_BEDROCK_STOP_SEQUENCES,
          maxTokens,
        }
      : llmType === 'gemini'
      ? {}
      : { n: 1, stop: stop ?? null };

  // Only include temperature if explicitly provided (not undefined)
  // This allows connector config temperature to be used when not specified
  return temperature !== undefined ? { ...baseArgs, temperature } : baseArgs;
};

// this is a fallback for logging, connector will default to the connector model
// x-pack/platform/plugins/shared/stack_connectors/common/openai/constants.ts
export const DEFAULT_OPEN_AI_MODEL = 'gpt-4.1';
const DEFAULT_BEDROCK_STOP_SEQUENCES = ['\n\nHuman:', '\nObservation:'];
export const DEFAULT_TIMEOUT = 180000;
