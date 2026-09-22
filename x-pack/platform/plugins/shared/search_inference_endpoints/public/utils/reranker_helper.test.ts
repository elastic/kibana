/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isProviderTechPreview } from './reranker_helper';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';

describe('Reranker Tech preview badge', () => {
  const mockProvider = {
    inference_id: 'elastic-rerank',
    task_type: 'rerank',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.rerank-v1',
    },
    task_settings: {
      return_documents: true,
    },
  } as any;

  const mockJinaEmbeddingsV3Provider = {
    inference_id: '.jina-embeddings-v3',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: {
      model_id: 'jina-embeddings-v3',
    },
    chunking_settings: {},
  } as InferenceInferenceEndpointInfo;

  const mockJinaRerankerV2Provider = {
    inference_id: '.jina-reranker-v2',
    task_type: 'rerank',
    service: 'elastic',
    service_settings: {
      model_id: 'jina-reranker-v2',
    },
    chunking_settings: {},
  } as InferenceInferenceEndpointInfo;

  it('return true for reranker', () => {
    expect(isProviderTechPreview(mockProvider)).toEqual(true);
  });

  it('should return false for jina-embeddings-v3 model', () => {
    expect(isProviderTechPreview(mockJinaEmbeddingsV3Provider)).toEqual(false);
  });

  it('should return false for jina-reranker-v2 model', () => {
    expect(isProviderTechPreview(mockJinaRerankerV2Provider)).toEqual(false);
  });

  it('return false for rainbow-sprinkles', () => {
    const elasticProviderServiceSettings = {
      ...mockProvider.service_settings,
      model_id: 'rainbow-sprinkles',
    };
    const elasticProvider = {
      ...mockProvider,
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: elasticProviderServiceSettings,
    } as any;
    expect(isProviderTechPreview(elasticProvider)).toEqual(false);
  });

  it('return false for other provider', () => {
    const otherProviderServiceSettings = {
      ...mockProvider.service_settings,
      model_id: '.elser_model_2',
    };
    const otherProvider = {
      ...mockProvider,
      task_type: 'sparse_embedding',
      service_settings: otherProviderServiceSettings,
    } as any;
    expect(isProviderTechPreview(otherProvider)).toEqual(false);
  });

  it('return false for other provider without model_id', () => {
    const mockThirdPartyProvider = {
      inference_id: 'azure-openai-1',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
    } as any;
    expect(isProviderTechPreview(mockThirdPartyProvider)).toEqual(false);
  });
});
