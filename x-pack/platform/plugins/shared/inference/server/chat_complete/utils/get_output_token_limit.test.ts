/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { getOutputTokenLimit } from './get_output_token_limit';

const connector = {
  type: InferenceConnectorType.OpenAI,
  config: { defaultModel: 'gpt-4o' },
} as InferenceConnector;

describe('getOutputTokenLimit', () => {
  it('omits an invalid cap', () => {
    expect(getOutputTokenLimit(undefined, { connector })).toEqual({});
    expect(getOutputTokenLimit(0, { connector })).toEqual({});
    expect(getOutputTokenLimit(-1, { connector })).toEqual({});
    expect(getOutputTokenLimit(1.5, { connector })).toEqual({});
  });

  it('sends max_tokens for models that still accept it', () => {
    expect(getOutputTokenLimit(16000, { connector, modelName: 'gpt-4o' })).toEqual({
      max_tokens: 16000,
    });
  });

  it.each([
    'o1',
    'o1-mini',
    'o3',
    'o4-mini',
    'gpt-5',
    'gpt-5.2-chat',
    'openai/gpt-5',
    'llm-gateway/gpt-5.2-chat',
    '.openai-gpt-5.4-chat',
  ])('sends max_completion_tokens for %s', (modelName) => {
    expect(getOutputTokenLimit(16000, { connector, modelName })).toEqual({
      max_completion_tokens: 16000,
    });
  });

  it('uses the connector default model when the call does not name one', () => {
    const reasoningConnector = {
      type: InferenceConnectorType.OpenAI,
      config: { defaultModel: 'gpt-5' },
    } as InferenceConnector;

    expect(getOutputTokenLimit(16000, { connector: reasoningConnector })).toEqual({
      max_completion_tokens: 16000,
    });
  });
});
