/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getArtifactMappings } from '../artifact/mappings';

export const DEFAULT_ELSER = '.elser-2-elasticsearch';
export const DEFAULT_E5_SMALL = '.multilingual-e5-small-elasticsearch';
export const DEFAULT_JINA = '.jina-embeddings-v5-text-small';

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
    inference_id: '.jina-embeddings-v5-text-small',
  },
};
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

export const createTargetIndex = async ({
  indexName,
  client,
  semanticTextMapping,
}: {
  indexName: string;
  client: Client;
  semanticTextMapping?: SemanticTextMapping;
}) => {
  const mappings = semanticTextMapping
    ? getArtifactMappings(semanticTextMapping)
    : getArtifactMappings(getSemanticTextMapping(DEFAULT_ELSER));
  await client.indices.create({
    index: indexName,
    mappings,
    settings: {
      'index.mapping.semantic_text.use_legacy_format': false,
    },
  });
};
