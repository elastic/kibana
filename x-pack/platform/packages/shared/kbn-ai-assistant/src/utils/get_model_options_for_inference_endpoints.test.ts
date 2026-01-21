/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelOptionsData } from './get_model_options_for_inference_endpoints';
import {
  e5SmallDescription,
  e5SmallTitle,
  elserDescription,
  elserTitle,
  jinaEmbeddingsV3Title,
  jinaEmbeddingsV3Description,
  getModelOptionsForInferenceEndpoints,
} from './get_model_options_for_inference_endpoints';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  E5_SMALL_INFERENCE_ID,
  ELSER_IN_EIS_INFERENCE_ID,
  JINA_EMBEDDINGS_V3_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';

describe('getModelOptionsForInferenceEndpoints', () => {
  describe('for existing knowledge base installations', () => {
    it('maps known inference endpoints to user-friendly titles and descriptions', () => {
      const endpoints = [
        { inference_id: ELSER_ON_ML_NODE_INFERENCE_ID },
        { inference_id: E5_SMALL_INFERENCE_ID },
      ] as InferenceAPIConfigResponse[];

      const options: ModelOptionsData[] = getModelOptionsForInferenceEndpoints({
        endpoints,
        isKnowledgeBaseInstalled: true,
      });

      expect(options).toEqual([
        {
          key: ELSER_ON_ML_NODE_INFERENCE_ID,
          label: elserTitle,
          description: elserDescription,
        },
        {
          key: E5_SMALL_INFERENCE_ID,
          label: e5SmallTitle,
          description: e5SmallDescription,
        },
      ]);
    });

    it('shows all models including Jina when KB is already installed', () => {
      const endpoints = [
        { inference_id: ELSER_IN_EIS_INFERENCE_ID },
        { inference_id: E5_SMALL_INFERENCE_ID },
        { inference_id: JINA_EMBEDDINGS_V3_INFERENCE_ID },
      ] as InferenceAPIConfigResponse[];

      const options = getModelOptionsForInferenceEndpoints({
        endpoints,
        isKnowledgeBaseInstalled: true,
      });

      expect(options.map((o) => o.key)).toEqual([
        ELSER_IN_EIS_INFERENCE_ID,
        E5_SMALL_INFERENCE_ID,
        JINA_EMBEDDINGS_V3_INFERENCE_ID,
      ]);
    });

    it('shows ELSER in EIS and hides ELSER on ML-node if both are available', () => {
      const endpoints = [
        { inference_id: ELSER_IN_EIS_INFERENCE_ID },
        { inference_id: ELSER_ON_ML_NODE_INFERENCE_ID },
        { inference_id: E5_SMALL_INFERENCE_ID },
      ] as InferenceAPIConfigResponse[];

      const options = getModelOptionsForInferenceEndpoints({
        endpoints,
        isKnowledgeBaseInstalled: true,
      });

      expect(options.map((o) => o.key)).toEqual([ELSER_IN_EIS_INFERENCE_ID, E5_SMALL_INFERENCE_ID]);
    });
  });

  describe('for new knowledge base installations', () => {
    it('returns only Jina Embedding v3 model when available', () => {
      const endpoints = [
        { inference_id: ELSER_IN_EIS_INFERENCE_ID },
        { inference_id: E5_SMALL_INFERENCE_ID },
        { inference_id: JINA_EMBEDDINGS_V3_INFERENCE_ID },
      ] as InferenceAPIConfigResponse[];

      const options = getModelOptionsForInferenceEndpoints({
        endpoints,
        isKnowledgeBaseInstalled: false,
      });

      expect(options).toEqual([
        {
          key: JINA_EMBEDDINGS_V3_INFERENCE_ID,
          label: jinaEmbeddingsV3Title,
          description: jinaEmbeddingsV3Description,
        },
      ]);
    });

    it('returns all available models when Jina Embedding v3 is not available', () => {
      const endpoints = [
        { inference_id: ELSER_ON_ML_NODE_INFERENCE_ID },
        { inference_id: E5_SMALL_INFERENCE_ID },
      ] as InferenceAPIConfigResponse[];

      const options = getModelOptionsForInferenceEndpoints({
        endpoints,
        isKnowledgeBaseInstalled: false,
      });

      expect(options.map((o) => o.key)).toEqual([
        ELSER_ON_ML_NODE_INFERENCE_ID,
        E5_SMALL_INFERENCE_ID,
      ]);
    });
  });

  describe('default behavior (for backwards compatibility)', () => {
    it('defaults to isKnowledgeBaseInstalled=false and returns only Jina Embedding v3 when available', () => {
      const endpoints = [
        { inference_id: ELSER_IN_EIS_INFERENCE_ID },
        { inference_id: E5_SMALL_INFERENCE_ID },
        { inference_id: JINA_EMBEDDINGS_V3_INFERENCE_ID },
      ] as InferenceAPIConfigResponse[];

      const options = getModelOptionsForInferenceEndpoints({
        endpoints,
      });

      expect(options).toEqual([
        {
          key: JINA_EMBEDDINGS_V3_INFERENCE_ID,
          label: jinaEmbeddingsV3Title,
          description: jinaEmbeddingsV3Description,
        },
      ]);
    });

    it('returns all models when Jina Embedding v3 is not available', () => {
      const endpoints = [
        { inference_id: ELSER_ON_ML_NODE_INFERENCE_ID },
        { inference_id: E5_SMALL_INFERENCE_ID },
      ] as InferenceAPIConfigResponse[];

      const options = getModelOptionsForInferenceEndpoints({
        endpoints,
      });

      expect(options.map((o) => o.key)).toEqual([
        ELSER_ON_ML_NODE_INFERENCE_ID,
        E5_SMALL_INFERENCE_ID,
      ]);
    });
  });
});
