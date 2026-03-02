/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';

/**
 * Default inference endpoint IDs for Elasticsearch models
 */
export const DEFAULT_ELSER = '.elser-2-elasticsearch';
export const DEFAULT_E5_SMALL = '.multilingual-e5-small-elasticsearch';

/**
 * Supported inference endpoint IDs
 */
export type SupportedInferenceId = typeof DEFAULT_E5_SMALL | typeof DEFAULT_ELSER;

/**
 * Check if an inference ID is a supported built-in model
 */
export const isSupportedInferenceId = (
  inferenceId: string
): inferenceId is SupportedInferenceId => {
  return inferenceId === DEFAULT_E5_SMALL || inferenceId === DEFAULT_ELSER;
};

/**
 * Base semantic text mapping configuration
 */
interface BaseSemanticTextMapping {
  type: 'semantic_text';
  inference_id: string;
}

/**
 * Model settings for semantic text mappings
 */
export interface SemanticTextModelSettings {
  service?: string;
  task_type?: string;
  dimensions?: number;
  similarity?: string;
  element_type?: string;
}

/**
 * Complete semantic text mapping configuration including optional model settings
 */
export interface SemanticTextMapping extends BaseSemanticTextMapping {
  model_settings?: SemanticTextModelSettings;
}

/**
 * Pre-configured semantic text mappings for supported inference endpoints
 */
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
};

/**
 * Get the semantic text mapping configuration for a given inference ID.
 * Supports built-in models (ELSER, E5-small) with pre-configured settings.
 *
 * @param inferenceId - The inference endpoint ID
 * @returns The semantic text mapping configuration
 * @throws Error if the inference ID is not supported
 */
export const getSemanticTextMapping = (inferenceId: string): SemanticTextMapping => {
  if (isSupportedInferenceId(inferenceId)) {
    return INFERENCE_ID_TO_SEMANTIC_TEXT_MAPPING[inferenceId];
  }
  throw new Error(`Semantic text mapping for Inference ID ${inferenceId} not found`);
};

/**
 * Default index settings for AI artifact indices.
 * These settings are optimized for semantic text storage and retrieval.
 */
export const DEFAULT_AI_ARTIFACT_INDEX_SETTINGS: IndicesIndexSettings = {
  'index.mapping.semantic_text.use_legacy_format': false,
};

/**
 * Configuration options for creating an AI artifact index
 */
export interface AiArtifactIndexConfig {
  /** The name of the index to create */
  indexName: string;
  /** Optional custom index settings (merged with defaults) */
  settings?: IndicesIndexSettings;
  /** The inference ID to use for semantic text fields */
  inferenceId?: string;
}

/**
 * Get the complete index settings for an AI artifact index.
 * Merges custom settings with the default AI artifact settings.
 *
 * @param customSettings - Optional custom settings to merge with defaults
 * @returns Complete index settings object
 */
export const getAiArtifactIndexSettings = (
  customSettings?: IndicesIndexSettings
): IndicesIndexSettings => {
  return {
    ...DEFAULT_AI_ARTIFACT_INDEX_SETTINGS,
    ...customSettings,
  };
};
