/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { INFERENCE_SETTINGS_SO_TYPE } from '../../common/constants';
import type { InferenceSettingsAttributes } from '../../common/types';
import { parseInferenceSettingsSO, validateInferenceSettings } from './inference_settings';

describe('Inference Settings utils', () => {
  describe('parseInferenceSettingsSO', () => {
    it('should parse saved object to API response', () => {
      const so: SavedObject<InferenceSettingsAttributes> = {
        id: 'default',
        type: INFERENCE_SETTINGS_SO_TYPE,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        attributes: {
          features: [
            { feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] },
          ],
        },
        references: [],
        version: '1',
        namespaces: ['default'],
        migrationVersion: {},
        coreMigrationVersion: '9.0.0',
      };

      expect(parseInferenceSettingsSO(so)).toEqual({
        _meta: {
          id: 'default',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
        data: {
          features: [
            { feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] },
          ],
        },
      });
    });

    it('should handle undefined timestamps', () => {
      const so: SavedObject<InferenceSettingsAttributes> = {
        id: 'default',
        type: INFERENCE_SETTINGS_SO_TYPE,
        attributes: {
          features: [],
        },
        references: [],
      };

      const result = parseInferenceSettingsSO(so);
      expect(result._meta.createdAt).toBeUndefined();
      expect(result._meta.updatedAt).toBeUndefined();
    });
  });

  describe('validateInferenceSettings', () => {
    it('should return empty array for valid settings', () => {
      const attrs: InferenceSettingsAttributes = {
        features: [
          { feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] },
          { feature_id: 'attack_discovery', endpoint_ids: ['.eis-claude-3.7-sonnet'] },
        ],
      };

      expect(validateInferenceSettings(attrs)).toEqual([]);
    });

    it('should return empty array for empty features', () => {
      expect(validateInferenceSettings({ features: [] })).toEqual([]);
    });

    it('should detect duplicate feature_id values', () => {
      const attrs: InferenceSettingsAttributes = {
        features: [
          { feature_id: 'agent_builder', endpoint_ids: ['.endpoint-a'] },
          { feature_id: 'agent_builder', endpoint_ids: ['.endpoint-b'] },
        ],
      };

      const errors = validateInferenceSettings(attrs);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate feature_id values: agent_builder');
    });

    it('should detect duplicate endpoint_ids within a feature', () => {
      const attrs: InferenceSettingsAttributes = {
        features: [{ feature_id: 'agent_builder', endpoint_ids: ['.endpoint-a', '.endpoint-a'] }],
      };

      const errors = validateInferenceSettings(attrs);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate endpoint_ids in feature "agent_builder"');
    });

    it('should detect multiple validation errors', () => {
      const attrs: InferenceSettingsAttributes = {
        features: [
          { feature_id: 'agent_builder', endpoint_ids: ['.endpoint-a', '.endpoint-a'] },
          { feature_id: 'agent_builder', endpoint_ids: ['.endpoint-b'] },
        ],
      };

      const errors = validateInferenceSettings(attrs);
      expect(errors).toHaveLength(2);
    });
  });
});
