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

describe('Inference Features API', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let mockRouter: MockRouter;
  let featureRegistry: InferenceFeatureRegistry;
  let context: jest.Mocked<RequestHandlerContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    featureRegistry = new InferenceFeatureRegistry(mockLogger);
    context = {} as jest.Mocked<RequestHandlerContext>;
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

    it('should return registered features', async () => {
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

    it('should return multiple features with parent-child relationships', async () => {
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
  });
});
