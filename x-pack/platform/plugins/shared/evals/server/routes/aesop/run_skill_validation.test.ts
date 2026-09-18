/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import type { IRouter } from '@kbn/core/server';
import type { EvalsRequestHandlerContext } from '../../types';
import { registerRunSkillValidationRoute } from './run_skill_validation';

const flushPromises = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

describe('AESOP Run Skill Validation Route', () => {
  let mockRouter: jest.Mocked<IRouter<EvalsRequestHandlerContext>>;
  let mockContext: any;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let routeHandler: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

    mockContext = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
      }),
      evals: Promise.resolve({
        getActionsStart: () => undefined,
      }),
    };

    mockRouter = {
      versioned: {
        post: jest.fn(),
      },
    } as any;

    mockRouter.versioned.post.mockReturnValue({
      addVersion: jest.fn((_config: any, handler: Function) => {
        routeHandler = handler;
      }),
    });

    registerRunSkillValidationRoute({ router: mockRouter, logger: mockLogger });
  });

  const validationRequest = (body: Record<string, unknown> = { connector_id: 'connector-1' }) =>
    httpServerMock.createKibanaRequest({
      params: { skillId: 'skill-1' },
      body,
    });

  const persistedValidationStatuses = () =>
    mockEsClient.update.mock.calls.map(
      ([arg]: any[]) => (arg as any).body?.doc?.validation?.status
    );

  describe('loading the skill', () => {
    it('returns 404 when the skill document does not exist', async () => {
      mockEsClient.get.mockRejectedValue({
        meta: { statusCode: 404 },
        message: 'document_missing_exception',
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, validationRequest(), mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: 'Skill skill-1 not found' },
      });
      expect(mockResponse.customError).not.toHaveBeenCalled();
    });

    it('returns 404 when the document source is unavailable', async () => {
      mockEsClient.get.mockResolvedValue({ _source: undefined } as any);

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, validationRequest(), mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalled();
      expect(mockResponse.customError).not.toHaveBeenCalled();
    });

    it('still returns 500 when loading the skill fails with a non-404 error', async () => {
      mockEsClient.get.mockRejectedValue(new Error('connection refused'));

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, validationRequest(), mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });

  describe('convergence loop failure handling', () => {
    it('persists a failed status when the convergence loop cannot validate the skill', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: { name: 'Test Skill', markdown: '# Test', confidence: 0.8 },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);

      const mockActionsClient = {
        execute: jest.fn().mockResolvedValue({
          status: 'error',
          message: 'connector unavailable',
          serviceMessage: 'boom',
        }),
      };
      mockContext.evals = Promise.resolve({
        getActionsStart: () => ({
          getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
        }),
      });

      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(
        mockContext,
        validationRequest({ connector_id: 'connector-1', auto_converge: true }),
        mockResponse
      );
      await flushPromises();

      const statuses = persistedValidationStatuses();
      expect(statuses).toContain('failed');
      expect(statuses[statuses.length - 1]).toBe('failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Convergence loop error'),
        expect.any(Object)
      );
    });
  });
});
