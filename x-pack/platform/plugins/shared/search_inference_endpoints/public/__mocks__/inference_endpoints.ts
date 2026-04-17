/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type { InferenceEndpointWithMetadata } from '../../common/types';

export const InferenceEndpoints: Array<InferenceAPIConfigResponse | InferenceEndpointWithMetadata> =
  [
    {
      inference_id: '.anthropic-claude-3.7-sonnet-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-3.7-sonnet',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-02-24',
        },
        display: {
          name: 'Anthropic Claude Sonnet 3.7',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-3.7-sonnet-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-3.7-sonnet',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-02-24',
        },
        display: {
          name: 'Anthropic Claude Sonnet 3.7',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.5-haiku-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.5-haiku',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-10-01',
        },
        display: {
          name: 'Anthropic Claude Haiku 4.5',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.5-haiku-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.5-haiku',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-10-01',
        },
        display: {
          name: 'Anthropic Claude Haiku 4.5',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.5-opus-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.5-opus',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-05-14',
        },
        display: {
          name: 'Anthropic Claude Opus 4.5',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.5-opus-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.5-opus',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-05-14',
        },
        display: {
          name: 'Anthropic Claude Opus 4.5',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.5-sonnet-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.5-sonnet',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-09-29',
        },
        display: {
          name: 'Anthropic Claude Sonnet 4.5',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.5-sonnet-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.5-sonnet',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-09-29',
        },
        display: {
          name: 'Anthropic Claude Sonnet 4.5',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.6-opus-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.6-opus',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2026-02-05',
        },
        display: {
          name: 'Anthropic Claude Opus 4.6',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.6-opus-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.6-opus',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2026-02-05',
        },
        display: {
          name: 'Anthropic Claude Opus 4.6',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.6-sonnet-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.6-sonnet',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2026-02-17',
        },
        display: {
          name: 'Anthropic Claude Sonnet 4.6',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.anthropic-claude-4.6-sonnet-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'anthropic-claude-4.6-sonnet',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2026-02-17',
        },
        display: {
          name: 'Anthropic Claude Sonnet 4.6',
          model_creator: 'Anthropic',
        },
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
      metadata: {
        heuristics: {
          properties: ['english'],
          status: 'ga',
          release_date: '2023-10-17',
        },
        display: {
          name: 'Elastic ELSER v2',
          model_creator: 'Elastic',
        },
      },
    },
    {
      inference_id: '.elser-2-elasticsearch',
      task_type: 'sparse_embedding',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
        model_id: '.elser_model_2',
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
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-06-17',
        },
        display: {
          name: 'Google Gemini 2.5 Flash',
          model_creator: 'Google',
        },
      },
    },
    {
      inference_id: '.google-gemini-2.5-flash-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'google-gemini-2.5-flash',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-06-17',
        },
        display: {
          name: 'Google Gemini 2.5 Flash',
          model_creator: 'Google',
        },
      },
    },
    {
      inference_id: '.google-gemini-2.5-pro-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'google-gemini-2.5-pro',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-06-17',
        },
        display: {
          name: 'Google Gemini 2.5 Pro',
          model_creator: 'Google',
        },
      },
    },
    {
      inference_id: '.google-gemini-2.5-pro-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'google-gemini-2.5-pro',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-06-17',
        },
        display: {
          name: 'Google Gemini 2.5 Pro',
          model_creator: 'Google',
        },
      },
    },
    {
      inference_id: '.google-gemini-embedding-001',
      task_type: 'text_embedding',
      service: 'elastic',
      service_settings: {
        model_id: 'google-gemini-embedding-001',
        similarity: 'cosine',
        dimensions: 3072,
      },
      chunking_settings: {
        strategy: 'sentence',
        max_chunk_size: 250,
        sentence_overlap: 1,
      },
      metadata: {
        heuristics: {
          properties: ['multilingual'],
          status: 'ga',
          release_date: '2025-07-14',
        },
        display: {
          name: 'Google Gemini Embedding v1',
          model_creator: 'Google',
        },
      },
    },
    {
      inference_id: '.gp-llm-v2-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'gp-llm-v2',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-02-24',
        },
        display: {
          name: 'Anthropic Claude Sonnet 4.5',
          model_creator: 'Anthropic',
        },
      },
    },
    {
      inference_id: '.gp-llm-v2-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'gp-llm-v2',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-02-24',
        },
        display: {
          name: 'Anthropic Claude Sonnet 4.5',
          model_creator: 'Anthropic',
        },
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
      metadata: {
        heuristics: {
          properties: ['matryoshka', 'multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2024-09-18',
        },
        display: {
          name: 'Jina Embeddings v3',
          model_creator: 'Jina',
        },
      },
    },
    {
      inference_id: '.jina-embeddings-v5-text-nano',
      task_type: 'text_embedding',
      service: 'elastic',
      service_settings: {
        model_id: 'jina-embeddings-v5-text-nano',
        similarity: 'cosine',
        dimensions: 768,
      },
      chunking_settings: {
        strategy: 'sentence',
        max_chunk_size: 250,
        sentence_overlap: 1,
      },
      metadata: {
        heuristics: {
          properties: ['matryoshka', 'multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2026-02-18',
        },
        display: {
          name: 'Jina Embeddings v5 Text Nano',
          model_creator: 'Jina',
        },
      },
    },
    {
      inference_id: '.jina-embeddings-v5-text-small',
      task_type: 'text_embedding',
      service: 'elastic',
      service_settings: {
        model_id: 'jina-embeddings-v5-text-small',
        similarity: 'cosine',
        dimensions: 1024,
      },
      chunking_settings: {
        strategy: 'sentence',
        max_chunk_size: 250,
        sentence_overlap: 1,
      },
      metadata: {
        heuristics: {
          properties: ['matryoshka', 'multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2026-02-18',
        },
        display: {
          name: 'Jina Embeddings v5 Text Small',
          model_creator: 'Jina',
        },
      },
    },
    {
      inference_id: '.jina-reranker-v2-base-multilingual',
      task_type: 'rerank',
      service: 'elastic',
      service_settings: {
        model_id: 'jina-reranker-v2-base-multilingual',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2024-06-25',
        },
        display: {
          name: 'Jina Reranker v2',
          model_creator: 'Jina',
        },
      },
    },
    {
      inference_id: '.jina-reranker-v3',
      task_type: 'rerank',
      service: 'elastic',
      service_settings: {
        model_id: 'jina-reranker-v3',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2025-10-01',
        },
        display: {
          name: 'Jina Reranker v3',
          model_creator: 'Jina',
        },
      },
    },
    {
      inference_id: '.microsoft-multilingual-e5-large',
      task_type: 'text_embedding',
      service: 'elastic',
      service_settings: {
        model_id: 'microsoft-multilingual-e5-large',
        similarity: 'cosine',
        dimensions: 1024,
      },
      chunking_settings: {
        strategy: 'sentence',
        max_chunk_size: 250,
        sentence_overlap: 1,
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2024-02-08',
        },
        display: {
          name: 'Microsoft Multilingual E5 Large',
          model_creator: 'Microsoft',
        },
      },
    },
    {
      inference_id: '.multilingual-e5-small-elasticsearch',
      task_type: 'text_embedding',
      service: 'elasticsearch',
      service_settings: {
        num_threads: 1,
        model_id: '.multilingual-e5-small',
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
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2026-01-28',
        },
        display: {
          name: 'OpenAI GPT-4.1',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.openai-gpt-4.1-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'openai-gpt-4.1',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-04-14',
        },
        display: {
          name: 'OpenAI GPT-4.1',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.openai-gpt-4.1-mini-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'openai-gpt-4.1-mini',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-04-14',
        },
        display: {
          name: 'OpenAI GPT-4.1 Mini',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.openai-gpt-4.1-mini-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'openai-gpt-4.1-mini',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-04-14',
        },
        display: {
          name: 'OpenAI GPT-4.1 Mini',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.openai-gpt-5.2-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'openai-gpt-5.2',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-12-11',
        },
        display: {
          name: 'OpenAI GPT-5.2',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.openai-gpt-5.2-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'openai-gpt-5.2',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'ga',
          release_date: '2025-12-11',
        },
        display: {
          name: 'OpenAI GPT-5.2',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.openai-gpt-oss-120b-chat_completion',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'openai-gpt-oss-120b',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2025-08-05',
        },
        display: {
          name: 'OpenAI GPT-OSS-120B',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.openai-gpt-oss-120b-completion',
      task_type: 'completion',
      service: 'elastic',
      service_settings: {
        model_id: 'openai-gpt-oss-120b',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'open-weights'],
          status: 'ga',
          release_date: '2025-08-05',
        },
        display: {
          name: 'OpenAI GPT-OSS-120B',
          model_creator: 'OpenAI',
        },
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
      metadata: {
        heuristics: {
          properties: ['multilingual'],
          status: 'ga',
          release_date: '2024-01-25',
        },
        display: {
          name: 'OpenAI Text Embedding 3 Large',
          model_creator: 'OpenAI',
        },
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
      metadata: {
        heuristics: {
          properties: ['multilingual'],
          status: 'ga',
          release_date: '2024-01-25',
        },
        display: {
          name: 'OpenAI Text Embedding 3 Small',
          model_creator: 'OpenAI',
        },
      },
    },
    {
      inference_id: '.rainbow-sprinkles-elastic',
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: {
        model_id: 'rainbow-sprinkles',
      },
      metadata: {
        heuristics: {
          properties: ['multilingual', 'multimodal'],
          status: 'deprecated',
          release_date: '2025-02-24',
          end_of_life_date: '2026-04-15',
        },
        display: {
          name: 'Anthropic Claude Sonnet 3.7 (deprecated)',
          model_creator: 'Anthropic',
        },
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
