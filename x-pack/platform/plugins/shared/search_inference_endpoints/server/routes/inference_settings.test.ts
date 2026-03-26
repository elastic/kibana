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
  INFERENCE_SETTINGS_SO_TYPE,
  INFERENCE_SETTINGS_ID,
  ROUTE_VERSIONS,
} from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { MockRouter } from '../../__mocks__/router.mock';
import { defineInferenceSettingsRoutes } from './inference_settings';

describe('Inference Settings API', () => {
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
        path: APIRoutes.GET_INFERENCE_SETTINGS,
        version: ROUTE_VERSIONS.v1,
      });
      defineInferenceSettingsRoutes({
        logger: mockLogger,
        router: mockRouter.router,
      });
    });

    it('should return settings when they exist', async () => {
      mockSOClient.get.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        attributes: {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        },
        references: [],
      });

      await mockRouter.callRoute({});

      expect(mockSOClient.get).toHaveBeenCalledWith(
        INFERENCE_SETTINGS_SO_TYPE,
        INFERENCE_SETTINGS_ID
      );
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          _meta: {
            id: INFERENCE_SETTINGS_ID,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-02T00:00:00Z',
          },
          data: {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
            ],
          },
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should return empty defaults when settings do not exist', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_SETTINGS_SO_TYPE,
          INFERENCE_SETTINGS_ID
        )
      );

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          _meta: { id: INFERENCE_SETTINGS_ID },
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
        body: 'Forbidden',
      });
    });

    it('should re-throw non-SO errors', async () => {
      const error = new Error('Unexpected error');
      mockSOClient.get.mockRejectedValue(error);

      await expect(mockRouter.callRoute({})).rejects.toThrowError(error);
    });

    it('should return empty defaults when SO returns .error with 404', async () => {
      mockSOClient.get.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        error: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object not found',
        },
        attributes: {},
        references: [],
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          _meta: { id: INFERENCE_SETTINGS_ID },
          data: { features: [] },
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should return customError when SO returns .error with non-404', async () => {
      mockSOClient.get.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        error: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Access denied',
        },
        attributes: {},
        references: [],
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: {
          message: 'Access denied',
          attributes: {
            error: 'Forbidden',
          },
        },
      });
    });

    it('should include metadata in .error response', async () => {
      mockSOClient.get.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        error: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Something went wrong',
          metadata: { cause: 'index_not_found' },
        },
        attributes: {},
        references: [],
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Something went wrong',
          attributes: {
            error: 'Internal Server Error',
            cause: 'index_not_found',
          },
        },
      });
    });

    it('should use hidden types client', async () => {
      mockSOClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          INFERENCE_SETTINGS_SO_TYPE,
          INFERENCE_SETTINGS_ID
        )
      );

      await mockRouter.callRoute({});

      expect(mockCore.savedObjects.getClient).toHaveBeenCalledWith({
        includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
      });
    });
  });

  describe('PUT /internal/search_inference_endpoints/settings', () => {
    beforeEach(() => {
      mockRouter = new MockRouter({
        context,
        method: 'put',
        path: APIRoutes.PUT_INFERENCE_SETTINGS,
        version: ROUTE_VERSIONS.v1,
      });
      defineInferenceSettingsRoutes({
        logger: mockLogger,
        router: mockRouter.router,
      });
    });

    it('should upsert settings and return response', async () => {
      const settingsAttrs = {
        features: [
          { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
        ],
      };

      mockSOClient.create.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        attributes: settingsAttrs,
        references: [],
      });

      await mockRouter.callRoute({ body: settingsAttrs });

      expect(mockSOClient.create).toHaveBeenCalledWith(INFERENCE_SETTINGS_SO_TYPE, settingsAttrs, {
        id: INFERENCE_SETTINGS_ID,
        overwrite: true,
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          _meta: {
            id: INFERENCE_SETTINGS_ID,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          data: settingsAttrs,
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    describe('schema validation', () => {
      it('should accept a valid body', () => {
        mockRouter.shouldValidate({
          body: {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
            ],
          },
        });
      });

      it('should reject an empty feature_id', () => {
        mockRouter.shouldThrow({
          body: {
            features: [{ feature_id: '', endpoints: [{ id: '.endpoint-a' }] }],
          },
        });
      });

      it('should reject an empty endpoint id string', () => {
        mockRouter.shouldThrow({
          body: {
            features: [{ feature_id: 'agent_builder', endpoints: [{ id: '' }] }],
          },
        });
      });

      it('should reject missing features field', () => {
        mockRouter.shouldThrow({ body: {} });
      });

      it('should accept features at exactly maxSize (30)', () => {
        const features = Array.from({ length: 30 }, (_, i) => ({
          feature_id: `feature_${i}`,
          endpoints: [{ id: '.endpoint-a' }],
        }));
        mockRouter.shouldValidate({ body: { features } });
      });

      it('should reject features exceeding maxSize', () => {
        const features = Array.from({ length: 31 }, (_, i) => ({
          feature_id: `feature_${i}`,
          endpoints: [{ id: '.endpoint-a' }],
        }));
        mockRouter.shouldThrow({ body: { features } });
      });

      it('should accept endpoints at exactly maxSize (30)', () => {
        const endpoints = Array.from({ length: 30 }, (_, i) => ({ id: `.endpoint-${i}` }));
        mockRouter.shouldValidate({
          body: {
            features: [{ feature_id: 'agent_builder', endpoints }],
          },
        });
      });

      it('should reject endpoints exceeding maxSize', () => {
        const endpoints = Array.from({ length: 31 }, (_, i) => ({ id: `.endpoint-${i}` }));
        mockRouter.shouldThrow({
          body: {
            features: [{ feature_id: 'agent_builder', endpoints }],
          },
        });
      });

      it('should accept feature_id at exactly maxLength (256)', () => {
        mockRouter.shouldValidate({
          body: {
            features: [{ feature_id: 'a'.repeat(256), endpoints: [{ id: '.endpoint-a' }] }],
          },
        });
      });

      it('should reject feature_id exceeding maxLength', () => {
        mockRouter.shouldThrow({
          body: {
            features: [{ feature_id: 'a'.repeat(257), endpoints: [{ id: '.endpoint-a' }] }],
          },
        });
      });

      it('should accept endpoint id at exactly maxLength (256)', () => {
        mockRouter.shouldValidate({
          body: {
            features: [{ feature_id: 'agent_builder', endpoints: [{ id: 'a'.repeat(256) }] }],
          },
        });
      });

      it('should reject endpoint id exceeding maxLength', () => {
        mockRouter.shouldThrow({
          body: {
            features: [{ feature_id: 'agent_builder', endpoints: [{ id: 'a'.repeat(257) }] }],
          },
        });
      });
    });

    it('should reject duplicate feature_id values', async () => {
      await mockRouter.callRoute({
        body: {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-a' }] },
            { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
          ],
        },
      });

      expect(mockSOClient.create).not.toHaveBeenCalled();
      expect(mockRouter.response.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Invalid inference settings',
          attributes: {
            errors: expect.arrayContaining([
              expect.stringContaining('Duplicate feature_id values'),
            ]),
          },
        },
      });
    });

    it('should reject duplicate endpoints within a feature', async () => {
      await mockRouter.callRoute({
        body: {
          features: [
            {
              feature_id: 'agent_builder',
              endpoints: [{ id: '.endpoint-a' }, { id: '.endpoint-a' }],
            },
          ],
        },
      });

      expect(mockSOClient.create).not.toHaveBeenCalled();
      expect(mockRouter.response.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Invalid inference settings',
          attributes: {
            errors: expect.arrayContaining([
              expect.stringContaining('Duplicate endpoints in feature "agent_builder"'),
            ]),
          },
        },
      });
    });

    it('should return customError when SO create returns .error', async () => {
      mockSOClient.create.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        error: {
          statusCode: 409,
          error: 'Conflict',
          message: 'Version conflict',
        },
        attributes: {},
        references: [],
      });

      await mockRouter.callRoute({
        body: {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 409,
        body: {
          message: 'Version conflict',
          attributes: {
            error: 'Conflict',
          },
        },
      });
    });

    it('should include metadata in .error response', async () => {
      mockSOClient.create.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        error: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Something went wrong',
          metadata: { cause: 'mapper_parsing_exception' },
        },
        attributes: {},
        references: [],
      });

      await mockRouter.callRoute({
        body: {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Something went wrong',
          attributes: {
            error: 'Internal Server Error',
            cause: 'mapper_parsing_exception',
          },
        },
      });
    });

    it('should use hidden types client', async () => {
      const settingsAttrs = {
        features: [
          { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
        ],
      };

      mockSOClient.create.mockResolvedValue({
        id: INFERENCE_SETTINGS_ID,
        type: INFERENCE_SETTINGS_SO_TYPE,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        attributes: settingsAttrs,
        references: [],
      });

      await mockRouter.callRoute({ body: settingsAttrs });

      expect(mockCore.savedObjects.getClient).toHaveBeenCalledWith({
        includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
      });
    });

    it('should handle SO client errors', async () => {
      mockSOClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Forbidden'))
      );

      await mockRouter.callRoute({
        body: {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: 'Forbidden',
      });
    });

    it('should re-throw non-SO errors', async () => {
      const error = new Error('Unexpected error');
      mockSOClient.create.mockRejectedValue(error);

      await expect(
        mockRouter.callRoute({
          body: {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
            ],
          },
        })
      ).rejects.toThrowError(error);
    });
  });
});
