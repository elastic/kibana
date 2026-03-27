/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { APIRoutes } from '../../common/types';
import { MockRouter } from '../../__mocks__/router.mock';
import { defineConnectorRoutes } from './connectors';

describe('Connector Routes', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let mockRouter: MockRouter;
  const mockInferenceStart: jest.Mocked<InferenceServerStart> = {
    getClient: jest.fn(),
    getChatModel: jest.fn(),
    getConnectorList: jest.fn(),
    getDefaultConnector: jest.fn(),
    getConnectorById: jest.fn(),
    getInferenceEndpoints: jest.fn(),
    getInferenceEndpointById: jest.fn(),
  };

  const context = {} as jest.Mocked<RequestHandlerContext>;

  describe('GET /internal/search_inference_endpoints/connectors', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: APIRoutes.GET_CONNECTORS,
      });
      defineConnectorRoutes({
        logger: mockLogger,
        router: mockRouter.router,
        getInferenceStart: () => mockInferenceStart,
      });
    });

    it('returns connector list', async () => {
      const connectors = [
        { connectorId: 'c1', name: 'Model A', isPreconfigured: true },
        { connectorId: 'c2', name: 'Model B', isPreconfigured: false },
      ];
      mockInferenceStart.getConnectorList.mockResolvedValue(connectors as any);

      await mockRouter.callRoute({});

      expect(mockInferenceStart.getConnectorList).toHaveBeenCalled();
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: connectors });
    });

    it('returns 503 when inference plugin is not available', async () => {
      const router503 = new MockRouter({
        context,
        method: 'get',
        path: APIRoutes.GET_CONNECTORS,
      });
      defineConnectorRoutes({
        logger: mockLogger,
        router: router503.router,
        getInferenceStart: () => undefined,
      });

      await router503.callRoute({});

      expect(router503.response.custom).toHaveBeenCalledWith({
        statusCode: 503,
        body: 'Inference plugin not available',
      });
    });
  });

  describe('GET /internal/search_inference_endpoints/connectors/{connectorId}', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: APIRoutes.GET_CONNECTOR_BY_ID,
      });
      defineConnectorRoutes({
        logger: mockLogger,
        router: mockRouter.router,
        getInferenceStart: () => mockInferenceStart,
      });
    });

    it('returns a single connector by ID', async () => {
      const connector = { connectorId: 'c1', name: 'Model A', isPreconfigured: true };
      mockInferenceStart.getConnectorById.mockResolvedValue(connector as any);

      await mockRouter.callRoute({ params: { connectorId: 'c1' } });

      expect(mockInferenceStart.getConnectorById).toHaveBeenCalledWith('c1', expect.anything());
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: connector });
    });
  });
});
