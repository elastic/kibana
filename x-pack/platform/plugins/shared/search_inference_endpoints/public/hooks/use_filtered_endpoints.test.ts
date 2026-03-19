/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { InferenceEndpoints } from '../__mocks__/inference_endpoints';
import type { FilterOptions } from '../types';

import { useFilteredInferenceEndpoints } from './use_filtered_endpoints';

const makeFilters = (
  provider: ServiceProviderKeys[] = [],
  type: InferenceTaskType[] = []
): FilterOptions => ({
  provider,
  type,
});

describe('useFilteredInferenceEndpoints', () => {
  const emptyFilters = makeFilters();

  it('should return all endpoints when no filters or search key are applied', () => {
    const { result } = renderHook(() =>
      useFilteredInferenceEndpoints(InferenceEndpoints, emptyFilters, '')
    );

    expect(result.current).toHaveLength(InferenceEndpoints.length);
    expect(result.current).toEqual(InferenceEndpoints);
  });

  describe('provider filters', () => {
    it('should filter endpoints by single provider', () => {
      const filters = makeFilters([ServiceProviderKeys.elasticsearch]);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
      );

      expect(result.current).toHaveLength(3);
      expect(result.current.every((endpoint) => endpoint.service === 'elasticsearch')).toBe(true);
    });

    it('should filter endpoints by multiple providers', () => {
      const filters = makeFilters([ServiceProviderKeys.elasticsearch, ServiceProviderKeys.elastic]);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
      );

      expect(result.current).toHaveLength(29);
      expect(
        result.current.every(
          (endpoint) => endpoint.service === 'elasticsearch' || endpoint.service === 'elastic'
        )
      ).toBe(true);
    });

    it('should return empty array when provider filter has no matches', () => {
      const filters = makeFilters([ServiceProviderKeys.anthropic]);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe('type filters', () => {
    it('should filter endpoints by single task type', () => {
      const filters = makeFilters([], ['text_embedding']);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
      );

      expect(result.current).toHaveLength(6);
      expect(result.current.every((endpoint) => endpoint.task_type === 'text_embedding')).toBe(
        true
      );
    });

    it('should filter endpoints by multiple task types', () => {
      const filters = makeFilters([], ['sparse_embedding', 'rerank']);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
      );

      expect(result.current).toHaveLength(5);
      expect(
        result.current.every(
          (endpoint) => endpoint.task_type === 'sparse_embedding' || endpoint.task_type === 'rerank'
        )
      ).toBe(true);
    });
  });

  describe('combined provider and type filters', () => {
    it('should apply both provider and type filters', () => {
      const filters = makeFilters([ServiceProviderKeys.elasticsearch], ['text_embedding']);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].service).toBe('elasticsearch');
      expect(result.current[0].task_type).toBe('text_embedding');
      expect(result.current[0].inference_id).toBe('.multilingual-e5-small-elasticsearch');
    });

    it('should return empty array when combined filters have no matches', () => {
      const filters = makeFilters([ServiceProviderKeys.elasticsearch], ['completion']);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe('search by inference_id', () => {
    it('should filter by inference_id (case insensitive)', () => {
      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, emptyFilters, 'ELSER')
      );

      expect(result.current).toHaveLength(2);
      expect(result.current.every((endpoint) => endpoint.inference_id.includes('elser'))).toBe(
        true
      );
    });

    it('should filter by partial inference_id match', () => {
      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, emptyFilters, 'gp-llm-v2')
      );

      expect(result.current).toHaveLength(2);
      expect(result.current.every((endpoint) => endpoint.inference_id.includes('gp-llm-v2'))).toBe(
        true
      );
    });

    it('should return empty array when search has no matches', () => {
      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, emptyFilters, 'nonexistent-id')
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe('search by model_id', () => {
    it('should filter by model_id when present in service_settings', () => {
      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, emptyFilters, 'elser_model_2')
      );

      expect(result.current).toHaveLength(2);
      expect(
        result.current.every((endpoint) => {
          const modelId =
            'model_id' in endpoint.service_settings
              ? endpoint.service_settings.model_id
              : undefined;
          return modelId && modelId.includes('elser_model_2');
        })
      ).toBe(true);
    });

    it('should filter by model_id for other models', () => {
      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, emptyFilters, 'rainbow-sprinkles')
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].service).toBe('elastic');
      expect(result.current[0].inference_id).toBe('.rainbow-sprinkles-elastic');
    });

    it('should match endpoints by model_id case insensitively', () => {
      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, emptyFilters, 'GPT-4.1')
      );

      expect(result.current).toHaveLength(4);
      expect(
        result.current.every((endpoint) => endpoint.inference_id.includes('openai-gpt-4.1'))
      ).toBe(true);
    });
  });

  describe('combined filters and search', () => {
    it('should apply provider filter and search together', () => {
      const filters = makeFilters([ServiceProviderKeys.elasticsearch]);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, 'rerank-v1')
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].inference_id).toBe('.rerank-v1-elasticsearch');
    });

    it('should apply type filter and search together', () => {
      const filters = makeFilters([], ['text_embedding']);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, 'jina')
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].service).toBe('elastic');
      expect(result.current[0].task_type).toBe('text_embedding');
      expect(result.current[0].inference_id).toBe('.jina-embeddings-v3');
    });

    it('should apply all filters (provider, type, and search) together', () => {
      const filters = makeFilters([ServiceProviderKeys.elasticsearch], ['sparse_embedding']);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, 'elser')
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].inference_id).toBe('.elser-2-elasticsearch');
      expect(result.current[0].service).toBe('elasticsearch');
      expect(result.current[0].task_type).toBe('sparse_embedding');
    });

    it('should return empty array when combined filters and search have no matches', () => {
      const filters = makeFilters([ServiceProviderKeys.elasticsearch], ['completion']);

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(InferenceEndpoints, filters, 'nonexistent')
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe('all services coverage', () => {
    it('should filter each service type correctly', () => {
      const services = ['elasticsearch', 'elastic'];

      services.forEach((service) => {
        const filters = makeFilters([service as ServiceProviderKeys]);

        const { result } = renderHook(() =>
          useFilteredInferenceEndpoints(InferenceEndpoints, filters, '')
        );

        expect(result.current.length).toBeGreaterThan(0);
        expect(result.current.every((endpoint) => endpoint.service === service)).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should return empty array when inferenceEndpoints is empty', () => {
      const { result } = renderHook(() => useFilteredInferenceEndpoints([], emptyFilters, ''));

      expect(result.current).toHaveLength(0);
    });

    it('should handle endpoints with no model_id in service_settings', () => {
      const endpointsWithNoModelId: InferenceAPIConfigResponse[] = [
        {
          inference_id: 'endpoint-no-model',
          task_type: 'sparse_embedding',
          service: 'elasticsearch',
          service_settings: {
            num_allocations: 1,
            num_threads: 1,
          },
          task_settings: {},
        },
      ];

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(endpointsWithNoModelId, emptyFilters, 'endpoint-no-model')
      );
      expect(result.current).toHaveLength(1);
      expect(result.current[0].inference_id).toBe('endpoint-no-model');

      const { result: result2 } = renderHook(() =>
        useFilteredInferenceEndpoints(endpointsWithNoModelId, emptyFilters, 'some-model-id')
      );
      expect(result2.current).toHaveLength(0);
    });

    it('should search by service_settings.model field (alternative to model_id)', () => {
      const endpointsWithModelField: InferenceAPIConfigResponse[] = [
        {
          inference_id: 'bedrock-endpoint',
          task_type: 'text_embedding',
          service: 'amazonbedrock',
          service_settings: {
            model: 'amazon.titan-embed-text-v1',
          },
          task_settings: {},
        },
      ];

      const { result } = renderHook(() =>
        useFilteredInferenceEndpoints(endpointsWithModelField, emptyFilters, 'titan-embed')
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].inference_id).toBe('bedrock-endpoint');
    });
  });
});
