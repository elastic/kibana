/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { type InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { INFERENCE_SETTINGS_SO_TYPE } from '../../common/constants';
import type { InferenceSettingsAttributes } from '../../common/types';
import {
  parseInferenceSettingsSO,
  validateEndpointParameters,
  validateInferenceSettings,
} from './inference_settings';

const createEisConnector = (id: string, supportedEffortLevels: string[]): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: id,
  connectorId: id,
  config: {},
  capabilities: {},
  isPreconfigured: true,
  isInferenceEndpoint: true,
  isEis: true,
  metadata: { capabilities: { reasoning: { supported_effort_levels: supportedEffortLevels } } },
});

const withEffort = (id: string, effort: 'low' | 'high'): InferenceSettingsAttributes => ({
  features: [
    { feature_id: 'agent_builder', endpoints: [{ id, parameters: { reasoning: { effort } } }] },
  ],
});

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
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
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
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
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
          { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          { feature_id: 'attack_discovery', endpoints: [{ id: '.eis-claude-3.7-sonnet' }] },
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
          { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-a' }] },
          { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
        ],
      };

      const errors = validateInferenceSettings(attrs);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate feature_id values: agent_builder');
    });

    it('should detect duplicate endpoints within a feature', () => {
      const attrs: InferenceSettingsAttributes = {
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.endpoint-a' }, { id: '.endpoint-a' }],
          },
        ],
      };

      const errors = validateInferenceSettings(attrs);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Duplicate endpoints in feature "agent_builder"');
    });

    it('should detect multiple validation errors', () => {
      const attrs: InferenceSettingsAttributes = {
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.endpoint-a' }, { id: '.endpoint-a' }],
          },
          { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
        ],
      };

      const errors = validateInferenceSettings(attrs);
      expect(errors).toHaveLength(2);
    });
  });

  describe('validateEndpointParameters', () => {
    it('returns no errors when the endpoint supports the stored reasoning effort', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue(createEisConnector('openai-gpt-5.4', ['low', 'high']));

      await expect(
        validateEndpointParameters(withEffort('openai-gpt-5.4', 'high'), getConnectorById)
      ).resolves.toEqual([]);
      expect(getConnectorById).toHaveBeenCalledWith('openai-gpt-5.4');
    });

    it('returns an error when the endpoint does not support the stored reasoning effort', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue(createEisConnector('openai-gpt-5.4', ['low']));

      const errors = await validateEndpointParameters(
        withEffort('openai-gpt-5.4', 'high'),
        getConnectorById
      );

      expect(errors).toEqual([expect.stringContaining('Reasoning level "high" is not supported')]);
    });

    it('loads each endpoint once when several features store a reasoning effort for it', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue(createEisConnector('openai-gpt-5.4', ['low', 'high']));
      const endpoints = [
        { id: 'openai-gpt-5.4', parameters: { reasoning: { effort: 'low' as const } } },
      ];

      await validateEndpointParameters(
        {
          features: [
            { feature_id: 'agent_builder', endpoints },
            { feature_id: 'attack_discovery', endpoints },
          ],
        },
        getConnectorById
      );

      expect(getConnectorById).toHaveBeenCalledTimes(1);
    });

    it('skips endpoints that cannot be loaded', async () => {
      const getConnectorById = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(
        validateEndpointParameters(withEffort('missing', 'high'), getConnectorById)
      ).resolves.toEqual([]);
    });

    it('does not load endpoints without a stored reasoning effort', async () => {
      const getConnectorById = jest.fn();

      await expect(
        validateEndpointParameters(
          {
            features: [
              {
                feature_id: 'agent_builder',
                endpoints: [{ id: 'a' }, { id: 'b', parameters: { temperature: 0.2 } }],
              },
            ],
          },
          getConnectorById
        )
      ).resolves.toEqual([]);
      expect(getConnectorById).not.toHaveBeenCalled();
    });
  });
});
