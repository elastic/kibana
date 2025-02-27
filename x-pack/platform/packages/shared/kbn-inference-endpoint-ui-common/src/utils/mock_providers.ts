/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldType, InferenceProvider } from '../types/types';

export const mockProviders: InferenceProvider[] = [
  {
    service: 'hugging_face',
    name: 'Hugging Face',
    task_types: ['text_embedding', 'sparse_embedding'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
      url: {
        default_value: 'https://api.openai.com/v1/embeddings',
        description: 'The URL endpoint to use for the requests.',
        label: 'URL',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
    },
  },
  {
    service: 'cohere',
    name: 'Cohere',
    task_types: ['text_embedding', 'rerank', 'completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'rerank', 'completion'],
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['text_embedding', 'rerank', 'completion'],
      },
    },
  },
  {
    service: 'anthropic',
    name: 'Anthropic',
    task_types: ['completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['completion'],
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description:
          'By default, the anthropic service sets the number of requests allowed per minute to 50.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['completion'],
      },
      model_id: {
        default_value: null,
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['completion'],
      },
    },
  },
  {
    service: 'elastic',
    name: 'Elastic',
    task_types: ['sparse_embedding', 'chat_completion'],
    configurations: {
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: false,
        type: FieldType.INTEGER,
        supported_task_types: ['sparse_embedding', 'chat_completion'],
      },
      model_id: {
        default_value: null,
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: false,
        type: FieldType.STRING,
        supported_task_types: ['sparse_embedding', 'chat_completion'],
      },
      max_input_tokens: {
        default_value: null,
        description: 'Allows you to specify the maximum number of tokens per input.',
        label: 'Maximum Input Tokens',
        required: false,
        sensitive: false,
        updatable: false,
        type: FieldType.INTEGER,
        supported_task_types: ['sparse_embedding'],
      },
    },
  },
  {
    service: 'elasticsearch',
    name: 'Elasticsearch',
    task_types: ['sparse_embedding', 'text_embedding', 'rerank'],
    configurations: {
      num_allocations: {
        default_value: 1,
        description:
          'The total number of allocations this model is assigned across machine learning nodes.',
        label: 'Number Allocations',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['sparse_embedding', 'text_embedding', 'rerank'],
      },
      num_threads: {
        default_value: 2,
        description: 'Sets the number of threads used by each model allocation during inference.',
        label: 'Number Threads',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['sparse_embedding', 'text_embedding', 'rerank'],
      },
      model_id: {
        default_value: '.elser_model_2',
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['sparse_embedding', 'text_embedding', 'rerank'],
      },
    },
  },
];
