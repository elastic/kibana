/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SavedObject } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import { INFERENCE_SETTINGS_SO_TYPE } from '../../common/constants';
import type { InferenceSettingsAttributes } from '../../common/types';
import { createEisConnector } from '../../__mocks__/inference_connector.mock';
import {
  parseInferenceSettingsSO,
  validateEndpointParameters,
  validateInferenceSettings,
} from './inference_settings';

const logger = loggingSystemMock.createLogger();

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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns no errors when the endpoint supports the stored reasoning effort', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue(createEisConnector('openai-gpt-5.4', ['low', 'high']));

      await expect(
        validateEndpointParameters(withEffort('openai-gpt-5.4', 'high'), getConnectorById, logger)
      ).resolves.toEqual([]);
      expect(getConnectorById).toHaveBeenCalledWith('openai-gpt-5.4');
    });

    it('returns an error when the endpoint does not support the stored reasoning effort', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue(createEisConnector('openai-gpt-5.4', ['low']));

      const errors = await validateEndpointParameters(
        withEffort('openai-gpt-5.4', 'high'),
        getConnectorById,
        logger
      );

      expect(errors).toEqual([expect.stringContaining('Reasoning level "high" is not supported')]);
    });

    it('returns an error for each endpoint that does not support its stored reasoning effort', async () => {
      const getConnectorById = jest.fn((id: string) =>
        Promise.resolve(createEisConnector(id, ['low']))
      );

      const errors = await validateEndpointParameters(
        {
          features: [
            {
              feature_id: 'agent_builder',
              endpoints: [
                { id: 'openai-gpt-5.4', parameters: { reasoning: { effort: 'high' } } },
                { id: 'anthropic-claude-4.5', parameters: { reasoning: { effort: 'medium' } } },
              ],
            },
          ],
        },
        getConnectorById,
        logger
      );

      expect(errors).toEqual([
        expect.stringContaining('"high" is not supported by model "openai-gpt-5.4"'),
        expect.stringContaining('"medium" is not supported by model "anthropic-claude-4.5"'),
      ]);
    });

    it('loads each endpoint once and reports one error when several features store the same unsupported effort', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue(createEisConnector('openai-gpt-5.4', ['low']));
      const endpoints = [
        { id: 'openai-gpt-5.4', parameters: { reasoning: { effort: 'high' as const } } },
      ];

      const errors = await validateEndpointParameters(
        {
          features: [
            { feature_id: 'agent_builder', endpoints },
            { feature_id: 'attack_discovery', endpoints },
          ],
        },
        getConnectorById,
        logger
      );

      expect(getConnectorById).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(1);
    });

    it('accepts any reasoning effort for a connector that is not served by EIS', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue({ ...createEisConnector('openai-gpt-5.4', ['low']), isEis: false });

      await expect(
        validateEndpointParameters(withEffort('openai-gpt-5.4', 'high'), getConnectorById, logger)
      ).resolves.toEqual([]);
    });

    it('accepts any reasoning effort when EIS does not report the supported levels', async () => {
      const getConnectorById = jest
        .fn()
        .mockResolvedValue(createEisConnector('openai-gpt-5.4', []));

      await expect(
        validateEndpointParameters(withEffort('openai-gpt-5.4', 'high'), getConnectorById, logger)
      ).resolves.toEqual([]);
    });

    it('skips and logs endpoints that are not found', async () => {
      const getConnectorById = jest
        .fn()
        .mockRejectedValue(createInferenceRequestError('No connector found', 404));

      await expect(
        validateEndpointParameters(withEffort('missing', 'high'), getConnectorById, logger)
      ).resolves.toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"missing"'));
    });

    it('rethrows connector lookup failures other than not found', async () => {
      const getConnectorById = jest.fn().mockRejectedValue(new Error('Elasticsearch unavailable'));

      await expect(
        validateEndpointParameters(withEffort('openai-gpt-5.4', 'high'), getConnectorById, logger)
      ).rejects.toThrow('Elasticsearch unavailable');
    });
  });
});
