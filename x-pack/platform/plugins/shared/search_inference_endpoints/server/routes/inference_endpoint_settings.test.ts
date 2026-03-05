/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
  INFERENCE_ENDPOINT_SETTINGS_ID,
  ROUTE_VERSIONS,
} from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { MockRouter } from '../../__mocks__/router.mock';
import { defineInferenceEndpointSettingsRoutes } from './inference_endpoint_settings';

describe('Inference Endpoint Settings API', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let mockRouter: MockRouter;
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

  beforeEach(() => {
    jest.clearAllMocks();

    context = {
      core: Promise.resolve(mockCore),
    } as unknown as jest.Mocked<RequestHandlerContext>;
  });

  describe('GET /internal/search_inference_endpoints/settings', () => {
    beforeEach(() => {
      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: APIRoutes.GET_INFERENCE_ENDPOINT_SETTINGS,
        version: ROUTE_VERSIONS.v1,
      });
      defineInferenceEndpointSettingsRoutes({
        logger: mockLogger,
        router: mockRouter.router,
      });
    });

    it('should return settings when they exist', async () => {
      mockSOClient.get.mockResolvedValue({
        id: INFERENCE_ENDPOINT_SETTINGS_ID,
        type: INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        attributes: {
          features: [
            { feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] },
          ],
        },
        references: [],
      });

      await mockRouter.callRoute({});

      expect(mockSOClient.get).toHaveBeenCalledWith(
        INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
        INFERENCE_ENDPOINT_SETTINGS_ID
      );
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          _meta: {
            id: INFERENCE_ENDPOINT_SETTINGS_ID,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-02T00:00:00Z',
          },
          data: {
            features: [
              { feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] },
            ],
          },
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should return empty defaults when settings do not exist', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
          INFERENCE_ENDPOINT_SETTINGS_ID
        )
      );

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          _meta: { id: INFERENCE_ENDPOINT_SETTINGS_ID },
          data: { features: [] },
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should handle SO client errors', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Forbidden'))
      );

      await mockRouter.callRoute({});

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: 'Forbidden' },
      });
    });

    it('should re-throw non-SO errors', async () => {
      const error = new Error('Unexpected error');
      mockSOClient.get.mockRejectedValue(error);

      await expect(mockRouter.callRoute({})).rejects.toThrowError(error);
    });

    it('should use hidden types client', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
          INFERENCE_ENDPOINT_SETTINGS_ID
        )
      );

      await mockRouter.callRoute({});

      expect(mockCore.savedObjects.getClient).toHaveBeenCalledWith({
        includedHiddenTypes: [INFERENCE_ENDPOINT_SETTINGS_SO_TYPE],
      });
    });
  });

  describe('PUT /internal/search_inference_endpoints/settings', () => {
    beforeEach(() => {
      mockRouter = new MockRouter({
        context,
        method: 'put',
        path: APIRoutes.PUT_INFERENCE_ENDPOINT_SETTINGS,
        version: ROUTE_VERSIONS.v1,
      });
      defineInferenceEndpointSettingsRoutes({
        logger: mockLogger,
        router: mockRouter.router,
      });
    });

    it('should upsert settings and return response', async () => {
      const settingsAttrs = {
        features: [{ feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] }],
      };

      mockSOClient.create.mockResolvedValue({
        id: INFERENCE_ENDPOINT_SETTINGS_ID,
        type: INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        attributes: settingsAttrs,
        references: [],
      });

      await mockRouter.callRoute({ body: settingsAttrs });

      expect(mockSOClient.create).toHaveBeenCalledWith(
        INFERENCE_ENDPOINT_SETTINGS_SO_TYPE,
        settingsAttrs,
        { id: INFERENCE_ENDPOINT_SETTINGS_ID, overwrite: true }
      );
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          _meta: {
            id: INFERENCE_ENDPOINT_SETTINGS_ID,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          data: settingsAttrs,
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should reject duplicate feature_id values', async () => {
      await mockRouter.callRoute({
        body: {
          features: [
            { feature_id: 'agent_builder', endpoint_ids: ['.endpoint-a'] },
            { feature_id: 'agent_builder', endpoint_ids: ['.endpoint-b'] },
          ],
        },
      });

      expect(mockSOClient.create).not.toHaveBeenCalled();
      expect(mockRouter.response.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Invalid inference endpoint settings',
          attributes: {
            errors: expect.arrayContaining([
              expect.stringContaining('Duplicate feature_id values'),
            ]),
          },
        },
      });
    });

    it('should handle SO client errors', async () => {
      mockSOClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Forbidden'))
      );

      await mockRouter.callRoute({
        body: {
          features: [
            { feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] },
          ],
        },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: { message: 'Forbidden' },
      });
    });

    it('should re-throw non-SO errors', async () => {
      const error = new Error('Unexpected error');
      mockSOClient.create.mockRejectedValue(error);

      await expect(
        mockRouter.callRoute({
          body: {
            features: [
              { feature_id: 'agent_builder', endpoint_ids: ['.anthropic-claude-3.7-sonnet'] },
            ],
          },
        })
      ).rejects.toThrowError(error);
    });
  });
});
