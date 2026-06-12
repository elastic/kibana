/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { useCompatibleInferenceEndpoints } from './use_compatible_inference_endpoints';

describe('useCompatibleInferenceEndpoints', () => {
  describe('when endpoints are loading', () => {
    it('should return undefined while loading', () => {
      const { result } = renderHook(() => useCompatibleInferenceEndpoints(null, true));
      expect(result.current.compatibleEndpoints).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('when no endpoints are available', () => {
    it('should return ELSER as default when no endpoints are provided', () => {
      const { result } = renderHook(() => useCompatibleInferenceEndpoints([], false));
      expect(result.current?.compatibleEndpoints?.defaultInferenceId).toBe(
        defaultInferenceEndpoints.ELSER
      );
    });

    it('should have empty endpoint definitions with no endpoints', () => {
      const { result } = renderHook(() => useCompatibleInferenceEndpoints([], false));
      expect(result.current?.compatibleEndpoints?.endpointDefinitions).toEqual([]);
    });
  });

  describe('priority list sorting', () => {
    it('should prioritize Jina v5 when available', () => {
      const endpoints: InferenceAPIConfigResponse[] = [
        {
          inference_id: defaultInferenceEndpoints.JINAv5,
          task_type: 'text_embedding',
          service: 'elastic',
          service_settings: { model_id: 'jina-embeddings-v5-text-small' },
        },
        {
          inference_id: defaultInferenceEndpoints.ELSER,
          task_type: 'sparse_embedding',
          service: 'elastic',
          service_settings: { model_id: 'elser' },
        },
      ];
      const { result } = renderHook(() => useCompatibleInferenceEndpoints(endpoints, false));
      expect(result.current?.compatibleEndpoints?.defaultInferenceId).toBe(
        defaultInferenceEndpoints.JINAv5
      );
    });

    it('should prioritize ELSER_IN_EIS when Jina v5 is not available', () => {
      const endpoints: InferenceAPIConfigResponse[] = [
        {
          inference_id: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
          task_type: 'sparse_embedding',
          service: 'elastic',
          service_settings: { model_id: 'elser' },
        },
        {
          inference_id: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
          task_type: 'text_embedding',
          service: 'elastic',
          service_settings: { model_id: 'e5' },
        },
      ];
      const { result } = renderHook(() => useCompatibleInferenceEndpoints(endpoints, false));
      expect(result.current?.compatibleEndpoints?.defaultInferenceId).toBe(
        defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID
      );
    });

    it('should prioritize ELSER when only ELSER and MULTILINGUAL_E5_SMALL are available', () => {
      const endpoints: InferenceAPIConfigResponse[] = [
        {
          inference_id: defaultInferenceEndpoints.ELSER,
          task_type: 'sparse_embedding',
          service: 'elastic',
          service_settings: { model_id: 'elser' },
        },
        {
          inference_id: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
          task_type: 'text_embedding',
          service: 'elastic',
          service_settings: { model_id: 'e5' },
        },
      ];
      const { result } = renderHook(() => useCompatibleInferenceEndpoints(endpoints, false));
      expect(result.current?.compatibleEndpoints?.defaultInferenceId).toBe(
        defaultInferenceEndpoints.ELSER
      );
    });

    it('should use MULTILINGUAL_E5_SMALL when it is the only default endpoint available', () => {
      const endpoints: InferenceAPIConfigResponse[] = [
        {
          inference_id: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
          task_type: 'text_embedding',
          service: 'elastic',
          service_settings: { model_id: 'e5' },
        },
      ];
      const { result } = renderHook(() => useCompatibleInferenceEndpoints(endpoints, false));
      expect(result.current?.compatibleEndpoints?.defaultInferenceId).toBe(
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL
      );
    });
  });

  describe('endpoint definitions', () => {
    it('should filter out incompatible endpoints and only include compatible ones', () => {
      const endpoints: InferenceAPIConfigResponse[] = [
        {
          inference_id: defaultInferenceEndpoints.ELSER,
          task_type: 'sparse_embedding',
          service: 'elastic',
          service_settings: { model_id: 'elser' },
        },
        {
          inference_id: 'custom-endpoint',
          task_type: 'text_embedding',
          service: 'openai',
          service_settings: { model_id: 'text-embedding-3-large' },
        },
        {
          inference_id: 'incompatible-endpoint',
          task_type: 'completion',
          service: 'openai',
          service_settings: { model_id: 'gpt-4' },
        },
      ];
      const { result } = renderHook(() => useCompatibleInferenceEndpoints(endpoints, false));
      expect(result.current?.compatibleEndpoints?.endpointDefinitions).toHaveLength(2);
      expect(result.current?.compatibleEndpoints?.endpointDefinitions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            inference_id: defaultInferenceEndpoints.ELSER,
          }),
          expect.objectContaining({
            inference_id: 'custom-endpoint',
          }),
        ])
      );
    });

    it('should build correct descriptions for endpoints', () => {
      const endpoints: InferenceAPIConfigResponse[] = [
        {
          inference_id: defaultInferenceEndpoints.ELSER,
          task_type: 'sparse_embedding',
          service: 'elastic',
          service_settings: { model_id: 'elser' },
        },
        {
          inference_id: 'custom-endpoint',
          task_type: 'text_embedding',
          service: 'openai',
          service_settings: { model_id: 'text-embedding-3-large' },
        },
      ];
      const { result } = renderHook(() => useCompatibleInferenceEndpoints(endpoints, false));
      expect(result.current?.compatibleEndpoints?.endpointDefinitions).toContainEqual(
        expect.objectContaining({
          inference_id: defaultInferenceEndpoints.ELSER,
          description: 'Elastic Inference Service - elser',
        })
      );
      expect(result.current?.compatibleEndpoints?.endpointDefinitions).toContainEqual(
        expect.objectContaining({
          inference_id: 'custom-endpoint',
          description: 'OpenAI - text-embedding-3-large',
        })
      );
    });
  });
});
