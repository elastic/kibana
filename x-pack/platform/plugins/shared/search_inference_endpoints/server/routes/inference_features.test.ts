/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { ROUTE_VERSIONS } from '../../common/constants';
import type { InferenceFeaturesResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { MockRouter } from '../../__mocks__/router.mock';
import { InferenceFeatureRegistry } from '../inference_feature_registry';
import { defineInferenceFeaturesRoutes } from './inference_features';

const makeContext = (uiSettingsGet: jest.Mock): jest.Mocked<RequestHandlerContext> =>
  ({
    core: Promise.resolve({
      uiSettings: { client: { get: uiSettingsGet } },
    }),
  } as unknown as jest.Mocked<RequestHandlerContext>);

describe('Inference Features API', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let mockRouter: MockRouter;
  let featureRegistry: InferenceFeatureRegistry;
  let uiSettingsGet: jest.Mock;
  let context: jest.Mocked<RequestHandlerContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    featureRegistry = new InferenceFeatureRegistry(mockLogger);
    uiSettingsGet = jest.fn().mockRejectedValue(new Error('setting not found'));
    context = makeContext(uiSettingsGet);
  });

  describe('GET /internal/search_inference_endpoints/features', () => {
    beforeEach(() => {
      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: APIRoutes.GET_INFERENCE_FEATURES,
        version: ROUTE_VERSIONS.v1,
      });
      defineInferenceFeaturesRoutes({
        logger: mockLogger,
        router: mockRouter.router,
        featureRegistry,
      });
    });

    it('should return empty features array when no features are registered', async () => {
      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: { features: [] },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should return registered features with no visibilityCondition', async () => {
      featureRegistry.register({
        featureId: 'agent_builder_general',
        featureName: 'Agent Builder — General Models',
        featureDescription: 'Large, capable models for agent reasoning.',
        taskType: 'chat_completion',
        recommendedEndpoints: ['gemini-3.0-pro', 'claude-sonnet-4.6'],
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          features: [
            {
              featureId: 'agent_builder_general',
              featureName: 'Agent Builder — General Models',
              featureDescription: 'Large, capable models for agent reasoning.',
              taskType: 'chat_completion',
              recommendedEndpoints: ['gemini-3.0-pro', 'claude-sonnet-4.6'],
            },
          ],
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should return multiple features with parent-child relationships when no conditions', async () => {
      featureRegistry.register({
        featureId: 'agent_builder',
        featureName: 'Agent Builder',
        featureDescription: 'Root feature for Agent Builder.',
        taskType: 'chat_completion',
        recommendedEndpoints: ['gemini-3.0-pro'],
      });
      featureRegistry.register({
        featureId: 'agent_builder_small',
        parentFeatureId: 'agent_builder',
        featureName: 'Agent Builder — Small Model',
        featureDescription: 'Fast models for simple tasks.',
        taskType: 'chat_completion',
        maxNumberOfEndpoints: 3,
        recommendedEndpoints: ['gemini-2.0-flash'],
      });

      await mockRouter.callRoute({});

      const body = mockRouter.response.ok.mock.calls[0][0]!.body as InferenceFeaturesResponse;
      expect(body.features).toHaveLength(2);
      expect(body.features[0]).toEqual(expect.objectContaining({ featureId: 'agent_builder' }));
      expect(body.features[1]).toEqual(
        expect.objectContaining({
          featureId: 'agent_builder_small',
          parentFeatureId: 'agent_builder',
          maxNumberOfEndpoints: 3,
        })
      );
    });

    it('should include a feature whose visibilityCondition matches the current uiSetting', async () => {
      uiSettingsGet.mockResolvedValue('classic');

      featureRegistry.register({
        featureId: 'security',
        featureName: 'Security',
        featureDescription: 'Security group.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
      });
      featureRegistry.register({
        featureId: 'elastic_assistant',
        parentFeatureId: 'security',
        featureName: 'AI Assistant for Security',
        featureDescription: 'Chat model.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
        visibilityCondition: { key: 'aiAssistant:preferredChatExperience', value: 'classic' },
      });

      await mockRouter.callRoute({});

      const body = mockRouter.response.ok.mock.calls[0][0]!.body as InferenceFeaturesResponse;
      expect(body.features.map((f) => f.featureId)).toEqual(['security', 'elastic_assistant']);
    });

    it('should exclude a feature whose visibilityCondition does not match', async () => {
      uiSettingsGet.mockResolvedValue('agent');

      featureRegistry.register({
        featureId: 'security',
        featureName: 'Security',
        featureDescription: 'Security group.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
      });
      featureRegistry.register({
        featureId: 'elastic_assistant',
        parentFeatureId: 'security',
        featureName: 'AI Assistant for Security',
        featureDescription: 'Chat model.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
        visibilityCondition: { key: 'aiAssistant:preferredChatExperience', value: 'classic' },
      });

      await mockRouter.callRoute({});

      const body = mockRouter.response.ok.mock.calls[0][0]!.body as InferenceFeaturesResponse;
      expect(body.features.map((f) => f.featureId)).toEqual(['security']);
    });

    it('should fail open and include the feature when uiSettings.get throws', async () => {
      uiSettingsGet.mockRejectedValue(new Error('uiSettings unavailable'));

      featureRegistry.register({
        featureId: 'elastic_assistant',
        featureName: 'AI Assistant for Security',
        featureDescription: 'Chat model.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
        visibilityCondition: { key: 'aiAssistant:preferredChatExperience', value: 'classic' },
      });

      await mockRouter.callRoute({});

      const body = mockRouter.response.ok.mock.calls[0][0]!.body as InferenceFeaturesResponse;
      expect(body.features.map((f) => f.featureId)).toEqual(['elastic_assistant']);
    });

    it('reads each unique uiSetting key only once even when multiple features share it', async () => {
      uiSettingsGet.mockResolvedValue('classic');

      featureRegistry.register({
        featureId: 'first',
        featureName: 'First',
        featureDescription: 'First.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
        visibilityCondition: { key: 'shared_key', value: 'classic' },
      });
      featureRegistry.register({
        featureId: 'second',
        featureName: 'Second',
        featureDescription: 'Second.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
        visibilityCondition: { key: 'shared_key', value: 'classic' },
      });
      featureRegistry.register({
        featureId: 'third',
        featureName: 'Third',
        featureDescription: 'Third.',
        taskType: 'chat_completion',
        recommendedEndpoints: [],
        visibilityCondition: { key: 'other_key', value: 'classic' },
      });

      await mockRouter.callRoute({});

      expect(uiSettingsGet).toHaveBeenCalledTimes(2);
      expect(uiSettingsGet).toHaveBeenCalledWith('shared_key');
      expect(uiSettingsGet).toHaveBeenCalledWith('other_key');
    });
  });
});
