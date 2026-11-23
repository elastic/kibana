/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskTypeOptions, omitEmptyFieldValues, orderTaskTypes } from './helpers';

describe('orderTaskTypes', () => {
  it('moves chat_completion to the front while preserving the order of the rest', () => {
    expect(orderTaskTypes(['text_embedding', 'completion', 'chat_completion', 'rerank'])).toEqual([
      'chat_completion',
      'text_embedding',
      'completion',
      'rerank',
    ]);
  });

  it('returns the task types unchanged when chat_completion is not supported', () => {
    expect(orderTaskTypes(['text_embedding', 'sparse_embedding'])).toEqual([
      'text_embedding',
      'sparse_embedding',
    ]);
  });

  it('handles an empty list', () => {
    expect(orderTaskTypes([])).toEqual([]);
  });
});

describe('getTaskTypeOptions', () => {
  it('builds options with chat_completion first', () => {
    expect(getTaskTypeOptions(['completion', 'chat_completion'])).toEqual([
      { id: 'chat_completion', label: 'chat_completion', value: 'chat_completion' },
      { id: 'completion', label: 'completion', value: 'completion' },
    ]);
  });
});

describe('omitEmptyFieldValues', () => {
  it('removes null, undefined, and empty string values from dynamic fields', () => {
    expect(
      omitEmptyFieldValues({
        config: {
          inferenceId: 'openai-text_embedding-1',
          provider: 'openai',
          taskType: 'text_embedding',
          providerConfig: {
            model_id: 'text-embedding-3-small',
            organization_id: null,
            dimensions: undefined,
            url: '',
          },
          taskTypeConfig: { user: '', input_type: null },
        },
        secrets: {
          providerSecrets: { api_key: null, client_secret: 'secret' },
        },
      })
    ).toEqual({
      config: {
        inferenceId: 'openai-text_embedding-1',
        provider: 'openai',
        taskType: 'text_embedding',
        providerConfig: { model_id: 'text-embedding-3-small' },
        taskTypeConfig: {},
      },
      secrets: {
        providerSecrets: { client_secret: 'secret' },
      },
    });
  });

  it('keeps zero, false, lists, and maps', () => {
    const providerConfig = {
      max_input_tokens: 0,
      enabled: false,
      scopes: ['api'],
      headers: { 'x-custom': 'value' },
    };

    expect(
      omitEmptyFieldValues({
        config: {
          inferenceId: 'openai-text_embedding-1',
          provider: 'openai',
          taskType: 'text_embedding',
          providerConfig,
        },
        secrets: { providerSecrets: {} },
      }).config.providerConfig
    ).toEqual(providerConfig);
  });

  it('does not add missing dynamic field groups', () => {
    const result = omitEmptyFieldValues({
      config: {
        inferenceId: 'openai-text_embedding-1',
        provider: 'openai',
        taskType: 'text_embedding',
      },
      secrets: {},
    });

    expect(result.config).not.toHaveProperty('providerConfig');
    expect(result.config).not.toHaveProperty('taskTypeConfig');
    expect(result.secrets).not.toHaveProperty('providerSecrets');
  });
});
