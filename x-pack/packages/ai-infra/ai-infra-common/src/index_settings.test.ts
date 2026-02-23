/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ELSER,
  DEFAULT_E5_SMALL,
  DEFAULT_AI_ARTIFACT_INDEX_SETTINGS,
  getSemanticTextMapping,
  getAiArtifactIndexSettings,
  isSupportedInferenceId,
} from './index_settings';

describe('index_settings', () => {
  describe('constants', () => {
    it('should export DEFAULT_ELSER', () => {
      expect(DEFAULT_ELSER).toBe('.elser-2-elasticsearch');
    });

    it('should export DEFAULT_E5_SMALL', () => {
      expect(DEFAULT_E5_SMALL).toBe('.multilingual-e5-small-elasticsearch');
    });

    it('should export DEFAULT_AI_ARTIFACT_INDEX_SETTINGS', () => {
      expect(DEFAULT_AI_ARTIFACT_INDEX_SETTINGS).toEqual({
        'index.mapping.semantic_text.use_legacy_format': false,
      });
    });
  });

  describe('isSupportedInferenceId', () => {
    it('should return true for DEFAULT_ELSER', () => {
      expect(isSupportedInferenceId(DEFAULT_ELSER)).toBe(true);
    });

    it('should return true for DEFAULT_E5_SMALL', () => {
      expect(isSupportedInferenceId(DEFAULT_E5_SMALL)).toBe(true);
    });

    it('should return false for unsupported inference IDs', () => {
      expect(isSupportedInferenceId('custom-model')).toBe(false);
      expect(isSupportedInferenceId('')).toBe(false);
      expect(isSupportedInferenceId('.some-other-model')).toBe(false);
    });
  });

  describe('getSemanticTextMapping', () => {
    it('should return ELSER mapping for DEFAULT_ELSER', () => {
      const mapping = getSemanticTextMapping(DEFAULT_ELSER);
      expect(mapping).toEqual({
        type: 'semantic_text',
        inference_id: DEFAULT_ELSER,
      });
    });

    it('should return E5-small mapping with model_settings for DEFAULT_E5_SMALL', () => {
      const mapping = getSemanticTextMapping(DEFAULT_E5_SMALL);
      expect(mapping).toEqual({
        type: 'semantic_text',
        inference_id: DEFAULT_E5_SMALL,
        model_settings: {
          service: 'elasticsearch',
          task_type: 'text_embedding',
          dimensions: 384,
          similarity: 'cosine',
          element_type: 'float',
        },
      });
    });

    it('should throw error for unsupported inference ID', () => {
      expect(() => getSemanticTextMapping('unsupported-model')).toThrow(
        'Semantic text mapping for Inference ID unsupported-model not found'
      );
    });
  });

  describe('getAiArtifactIndexSettings', () => {
    it('should return default settings when no custom settings provided', () => {
      const settings = getAiArtifactIndexSettings();
      expect(settings).toEqual(DEFAULT_AI_ARTIFACT_INDEX_SETTINGS);
    });

    it('should merge custom settings with defaults', () => {
      const customSettings = {
        number_of_shards: 2,
        number_of_replicas: 1,
      };
      const settings = getAiArtifactIndexSettings(customSettings);
      expect(settings).toEqual({
        'index.mapping.semantic_text.use_legacy_format': false,
        number_of_shards: 2,
        number_of_replicas: 1,
      });
    });

    it('should allow custom settings to override defaults', () => {
      const customSettings = {
        'index.mapping.semantic_text.use_legacy_format': true,
      };
      const settings = getAiArtifactIndexSettings(customSettings);
      expect(settings).toEqual({
        'index.mapping.semantic_text.use_legacy_format': true,
      });
    });
  });
});
