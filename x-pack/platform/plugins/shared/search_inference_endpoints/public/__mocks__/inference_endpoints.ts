/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

export const InferenceEndpoints: InferenceAPIConfigResponse[] = [
  {
    inference_id: '.anthropic-claude-3.7-sonnet-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'anthropic-claude-3.7-sonnet',
    },
  },
  {
    inference_id: '.anthropic-claude-3.7-sonnet-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'anthropic-claude-3.7-sonnet',
    },
  },
  {
    inference_id: '.anthropic-claude-4.5-sonnet-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'anthropic-claude-4.5-sonnet',
    },
  },
  {
    inference_id: '.anthropic-claude-4.5-sonnet-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'anthropic-claude-4.5-sonnet',
    },
  },
  {
    inference_id: '.elser-2-elastic',
    task_type: 'sparse_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'elser_model_2',
    },
    chunking_settings: {
      strategy: 'sentence',
      max_chunk_size: 250,
      sentence_overlap: 1,
    },
  },
  {
    inference_id: '.elser-2-elasticsearch',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_threads: 1,
      model_id: '.elser_model_2_linux-x86_64',
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 0,
        max_number_of_allocations: 32,
      },
    },
    chunking_settings: {
      strategy: 'sentence',
      max_chunk_size: 250,
      sentence_overlap: 1,
    },
  },
  {
    inference_id: '.google-gemini-2.5-flash-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'google-gemini-2.5-flash',
    },
  },
  {
    inference_id: '.google-gemini-2.5-flash-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'google-gemini-2.5-flash',
    },
  },
  {
    inference_id: '.google-gemini-2.5-pro-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'google-gemini-2.5-pro',
    },
  },
  {
    inference_id: '.google-gemini-2.5-pro-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'google-gemini-2.5-pro',
    },
  },
  {
    inference_id: '.google-gemini-embedding-001',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'google-gemini-embedding-001',
      similarity: 'cosine',
      dimensions: 768,
    },
    chunking_settings: {
      strategy: 'sentence',
      max_chunk_size: 250,
      sentence_overlap: 1,
    },
  },
  {
    inference_id: '.gp-llm-v2-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'gp-llm-v2',
    },
  },
  {
    inference_id: '.gp-llm-v2-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'gp-llm-v2',
    },
  },
  {
    inference_id: '.jina-embeddings-v3',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'jina-embeddings-v3',
      similarity: 'cosine',
      dimensions: 1024,
    },
    chunking_settings: {
      strategy: 'sentence',
      max_chunk_size: 250,
      sentence_overlap: 1,
    },
  },
  {
    inference_id: '.jina-reranker-v2-base-multilingual',
    task_type: 'rerank',
    service: 'elastic',
    service_settings: {
      model_id: 'jina-reranker-v2-base-multilingual',
    },
  },
  {
    inference_id: '.jina-reranker-v3',
    task_type: 'rerank',
    service: 'elastic',
    service_settings: {
      model_id: 'jina-reranker-v3',
    },
  },
  {
    inference_id: '.multilingual-e5-small-elasticsearch',
    task_type: 'text_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_threads: 1,
      model_id: '.multilingual-e5-small_linux-x86_64',
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 0,
        max_number_of_allocations: 32,
      },
    },
    chunking_settings: {
      strategy: 'sentence',
      max_chunk_size: 250,
      sentence_overlap: 1,
    },
  },
  {
    inference_id: '.openai-gpt-4.1-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-4.1',
    },
  },
  {
    inference_id: '.openai-gpt-4.1-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-4.1',
    },
  },
  {
    inference_id: '.openai-gpt-4.1-mini-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-4.1-mini',
    },
  },
  {
    inference_id: '.openai-gpt-4.1-mini-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-4.1-mini',
    },
  },
  {
    inference_id: '.openai-gpt-5.2-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-5.2',
    },
  },
  {
    inference_id: '.openai-gpt-5.2-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-5.2',
    },
  },
  {
    inference_id: '.openai-gpt-oss-120b-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-oss-120b',
    },
  },
  {
    inference_id: '.openai-gpt-oss-120b-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-gpt-oss-120b',
    },
  },
  {
    inference_id: '.openai-text-embedding-3-large',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-text-embedding-3-large',
      similarity: 'cosine',
      dimensions: 3072,
    },
    chunking_settings: {
      strategy: 'sentence',
      max_chunk_size: 250,
      sentence_overlap: 1,
    },
  },
  {
    inference_id: '.openai-text-embedding-3-small',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'openai-text-embedding-3-small',
      similarity: 'cosine',
      dimensions: 1536,
    },
    chunking_settings: {
      strategy: 'sentence',
      max_chunk_size: 250,
      sentence_overlap: 1,
    },
  },
  {
    inference_id: '.rainbow-sprinkles-elastic',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: {
      model_id: 'rainbow-sprinkles',
    },
  },
  {
    inference_id: '.rerank-v1-elasticsearch',
    task_type: 'rerank',
    service: 'elasticsearch',
    service_settings: {
      num_threads: 1,
      model_id: '.rerank-v1',
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 0,
        max_number_of_allocations: 32,
      },
    },
    task_settings: {
      return_documents: true,
    },
  },
  {
    inference_id: 'alibabacloud-endpoint-without-model-id',
    task_type: 'completion',
    service: 'alibabacloud-ai-search',
    service_settings: {
      api_key: 'test-api-key',
      service_id: 'test-service-id',
      host: 'test-host',
      workspace: 'test-workspace',
      http_schema: 'https',
      rate_limit: {
        requests_per_minute: 1000,
      },
    },
  },
  {
    inference_id: 'hugging-face-endpoint-without-model-id',
    task_type: 'text_embedding',
    service: 'hugging_face',
    service_settings: {
      api_key: 'test-api-key',
      url: 'https://example.com/model-endpoint',
    },
  },
];
