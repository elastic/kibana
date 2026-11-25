/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import {
  FEATURE_SETTINGS_API_VERSION,
  INFERENCE_SETTINGS_ID,
  INFERENCE_SETTINGS_SO_TYPE,
} from '../../common/constants';
import type { InferenceSettingsAttributes } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { MockRouter } from '../../__mocks__/router.mock';
import { InferenceFeatureRegistry } from '../inference_feature_registry';
import { definePublicInferenceSettingsRoutes } from './public_inference_settings';

const savedSettings: InferenceSettingsAttributes = {
  features: [
    {
      feature_id: 'agent_builder',
      endpoints: [
        {
          id: '.anthropic-claude-4.6-sonnet-chat_completion',
          parameters: { reasoning: { effort: 'low' } },
        },
      ],
    },
    { feature_id: 'retired_feature', endpoints: [{ id: '.old-endpoint' }] },
  ],
};

describe('Public feature settings API', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  const mockSOClient = {
    create: jest.fn(),
    get: jest.fn(),
  };
  const mockCore = {
    savedObjects: {
      getClient: jest.fn().mockReturnValue(mockSOClient),
    },
  };
  let context: jest.Mocked<RequestHandlerContext>;
  let featureRegistry: InferenceFeatureRegistry;
  let getConnectorById: jest.Mock;

  const registerRoutes = (method: 'get' | 'put', path: string) => {
    const mockRouter = new MockRouter({
      context,
      method,
      path,
      version: FEATURE_SETTINGS_API_VERSION,
    });
    definePublicInferenceSettingsRoutes({
      logger: mockLogger,
      router: mockRouter.router,
      featureRegistry,
      getConnectorById,
    });
    return mockRouter;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    featureRegistry = new InferenceFeatureRegistry(mockLogger);
    featureRegistry.register({
      featureId: 'agent_builder',
      featureName: 'Agent Builder',
      featureDescription: 'Agent Builder',
      taskType: 'chat_completion',
      recommendedEndpoints: [],
    });
    getConnectorById = jest
      .fn()
      .mockRejectedValue(createInferenceRequestError('No connector found', 404));
    context = {
      core: Promise.resolve(mockCore),
    } as unknown as jest.Mocked<RequestHandlerContext>;
    mockSOClient.create.mockImplementation((_type, attributes) => Promise.resolve({ attributes }));
  });

  describe('GET /api/model_management/feature_settings', () => {
    it('returns an empty feature list when nothing is saved', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_SETTINGS_SO_TYPE,
          INFERENCE_SETTINGS_ID
        )
      );
      const mockRouter = registerRoutes('get', APIRoutes.GET_FEATURE_SETTINGS);

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: { features: [] } });
    });

    it('returns the saved features, including parameters', async () => {
      mockSOClient.get.mockResolvedValue({ attributes: savedSettings });
      const mockRouter = registerRoutes('get', APIRoutes.GET_FEATURE_SETTINGS);

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: savedSettings });
    });
  });

  describe('PUT /api/model_management/feature_settings', () => {
    it('saves a registered feature and returns the same document', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_SETTINGS_SO_TYPE,
          INFERENCE_SETTINGS_ID
        )
      );
      const settings = { features: [savedSettings.features[0]] };
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTINGS);

      await mockRouter.callRoute({ body: settings });

      expect(mockSOClient.create).toHaveBeenCalledWith(INFERENCE_SETTINGS_SO_TYPE, settings, {
        id: INFERENCE_SETTINGS_ID,
        overwrite: false,
        version: undefined,
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: settings });
    });

    it('accepts a feature id that is already saved', async () => {
      mockSOClient.get.mockResolvedValue({ attributes: savedSettings, version: 'saved-version' });
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTINGS);

      await mockRouter.callRoute({ body: savedSettings });

      expect(mockSOClient.create).toHaveBeenCalledWith(INFERENCE_SETTINGS_SO_TYPE, savedSettings, {
        id: INFERENCE_SETTINGS_ID,
        overwrite: true,
        version: 'saved-version',
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: savedSettings });
    });

    it('returns 409 when the settings changed after they were loaded', async () => {
      mockSOClient.get.mockResolvedValue({ attributes: savedSettings, version: 'saved-version' });
      mockSOClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(
          INFERENCE_SETTINGS_SO_TYPE,
          INFERENCE_SETTINGS_ID
        )
      );
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTINGS);

      await mockRouter.callRoute({ body: savedSettings });

      expect(mockRouter.response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 409 })
      );
    });

    it('rejects a feature id that is not registered and not saved', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_SETTINGS_SO_TYPE,
          INFERENCE_SETTINGS_ID
        )
      );
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTINGS);

      await mockRouter.callRoute({
        body: { features: [{ feature_id: 'not_a_feature', endpoints: [{ id: '.endpoint' }] }] },
      });

      expect(mockSOClient.create).not.toHaveBeenCalled();
      expect(mockRouter.response.badRequest).toHaveBeenCalledWith({
        body: expect.objectContaining({
          attributes: { errors: [expect.stringContaining('not_a_feature')] },
        }),
      });
    });
  });

  describe('PUT /api/model_management/feature_settings/{feature_id}', () => {
    it('replaces one feature and leaves the others unchanged', async () => {
      mockSOClient.get.mockResolvedValue({ attributes: savedSettings });
      const endpoints = [
        {
          id: '.anthropic-claude-4.6-sonnet-chat_completion',
          parameters: { reasoning: { effort: 'high' as const } },
        },
      ];
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTING);

      await mockRouter.callRoute({ params: { feature_id: 'agent_builder' }, body: { endpoints } });

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          features: [{ feature_id: 'agent_builder', endpoints }, savedSettings.features[1]],
        },
      });
    });

    it('adds a registered feature that is not saved yet', async () => {
      mockSOClient.get.mockResolvedValue({
        attributes: { features: [savedSettings.features[1]] },
      });
      const endpoints = [{ id: '.anthropic-claude-4.6-sonnet-chat_completion' }];
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTING);

      await mockRouter.callRoute({ params: { feature_id: 'agent_builder' }, body: { endpoints } });

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          features: [savedSettings.features[1], { feature_id: 'agent_builder', endpoints }],
        },
      });
    });

    it('checks reasoning effort only for the feature being updated', async () => {
      mockSOClient.get.mockResolvedValue({ attributes: savedSettings, version: 'saved-version' });
      const endpoints = [{ id: '.replacement-endpoint' }];
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTING);

      await mockRouter.callRoute({
        params: { feature_id: 'retired_feature' },
        body: { endpoints },
      });

      expect(getConnectorById).not.toHaveBeenCalled();
      expect(mockSOClient.create).toHaveBeenCalledWith(
        INFERENCE_SETTINGS_SO_TYPE,
        { features: [savedSettings.features[0], { feature_id: 'retired_feature', endpoints }] },
        { id: INFERENCE_SETTINGS_ID, overwrite: true, version: 'saved-version' }
      );
    });

    it('rejects an unknown feature id', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_SETTINGS_SO_TYPE,
          INFERENCE_SETTINGS_ID
        )
      );
      const mockRouter = registerRoutes('put', APIRoutes.PUT_FEATURE_SETTING);

      await mockRouter.callRoute({
        params: { feature_id: 'not_a_feature' },
        body: { endpoints: [{ id: '.endpoint' }] },
      });

      expect(mockSOClient.create).not.toHaveBeenCalled();
      expect(mockRouter.response.badRequest).toHaveBeenCalled();
    });
  });
});
