/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDefaultArguments = (llmType: string, temperature?: number, stop?: string[]) =>
  llmType === 'openai'
    ? { n: 1, stop: stop ?? null, temperature: temperature ?? DEFAULT_OPEN_AI_TEMPERATURE }
    : {
        temperature: temperature ?? DEFAULT_BEDROCK_TEMPERATURE,
        stopSequences: stop ?? DEFAULT_BEDROCK_STOP_SEQUENCES,
      };

const DEFAULT_OPEN_AI_TEMPERATURE = 0.2;
const DEFAULT_BEDROCK_TEMPERATURE = 0;
const DEFAULT_BEDROCK_STOP_SEQUENCES = ['\n\nHuman:', '\nObservation:'];
