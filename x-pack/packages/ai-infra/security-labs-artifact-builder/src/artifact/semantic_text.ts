/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';

export const DEFAULT_ELSER = defaultInferenceEndpoints.ELSER;
export const DEFAULT_E5_SMALL = defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL;
export const DEFAULT_JINA = defaultInferenceEndpoints.JINAv5;

interface BaseSemanticTextMapping {
  type: 'semantic_text';
  inference_id: string;
}
export interface SemanticTextMapping extends BaseSemanticTextMapping {
  model_settings?: {
    service?: string;
    task_type?: string;
    dimensions?: number;
    similarity?: string;
    element_type?: string;
  };
}

type SupportedInferenceId = typeof DEFAULT_E5_SMALL | typeof DEFAULT_ELSER | typeof DEFAULT_JINA;
const isSupportedInferenceId = (inferenceId: string): inferenceId is SupportedInferenceId => {
  return (
    inferenceId === DEFAULT_E5_SMALL ||
    inferenceId === DEFAULT_ELSER ||
    inferenceId === DEFAULT_JINA
  );
};

const INFERENCE_ID_TO_SEMANTIC_TEXT_MAPPING: Record<SupportedInferenceId, SemanticTextMapping> = {
  [DEFAULT_E5_SMALL]: {
    type: 'semantic_text',
    inference_id: DEFAULT_E5_SMALL,
    model_settings: {
      service: 'elasticsearch',
      task_type: 'text_embedding',
      dimensions: 384,
      similarity: 'cosine',
      element_type: 'float',
    },
  },
  [DEFAULT_ELSER]: {
    type: 'semantic_text',
    inference_id: DEFAULT_ELSER,
  },
  [DEFAULT_JINA]: {
    type: 'semantic_text',
    inference_id: DEFAULT_JINA,
  },
};

/**
 * Maps an inference id to the `semantic_text` field mapping used when creating the
 * build index. Falls back to a bare mapping for unrecognized inference ids.
 */
export const getSemanticTextMapping = (
  inferenceId: string = DEFAULT_ELSER
): SemanticTextMapping => {
  if (isSupportedInferenceId(inferenceId)) {
    return INFERENCE_ID_TO_SEMANTIC_TEXT_MAPPING[inferenceId];
  }
  return {
    type: 'semantic_text',
    inference_id: inferenceId,
  };
};
