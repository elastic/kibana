/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { handleEsError } from '../shared_imports';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerMLEnabledRoute } from './ml_enabled_cluster';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

describe('ML enabled cluster API', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
      lib: { handleEsError },
    };
    registerMLEnabledRoute(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/ml_enabled', () => {
    it('returns 200 status with mlEnabled true when ML is enabled', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {
          xpack: {
            ml: {
              enabled: 'true',
            },
          },
        },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_enabled',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        mlEnabled: true,
      });
    });

    it('returns 200 status with mlEnabled false when ML is disabled', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {
          xpack: {
            ml: {
              enabled: 'false',
            },
          },
        },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_enabled',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        mlEnabled: false,
      });
    });

    it('returns 200 status with mlEnabled false when ML settings are missing', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockResolvedValue({
        defaults: {},
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/ml_enabled',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        mlEnabled: false,
      });
    });

    it('handles Elasticsearch errors properly', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.cluster
          .getSettings as jest.Mock
      ).mockRejectedValue(new Error('Elasticsearch error'));

      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/ml_enabled',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('Elasticsearch error');
    });
  });
});
