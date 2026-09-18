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
import { registerImproveSkillRoute } from './improve_skill';

describe('AESOP Improve Skill Route', () => {
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

    registerImproveSkillRoute({ router: mockRouter, logger: mockLogger });
  });

  const improveRequest = () =>
    httpServerMock.createKibanaRequest({
      params: { skillId: 'skill-404' },
      body: { connector_id: 'connector-1' },
    });

  it('returns 404 when the skill document does not exist', async () => {
    mockEsClient.get.mockRejectedValue({
      meta: { statusCode: 404 },
      message: 'document_missing_exception',
    });

    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(mockContext, improveRequest(), mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalledWith({
      body: { message: 'Skill skill-404 not found' },
    });
    expect(mockResponse.customError).not.toHaveBeenCalled();
  });

  it('returns 404 when the document source is unavailable', async () => {
    mockEsClient.get.mockResolvedValue({ _source: undefined } as any);

    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(mockContext, improveRequest(), mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalled();
    expect(mockResponse.customError).not.toHaveBeenCalled();
  });

  it('still returns 500 when loading the skill fails with a non-404 error', async () => {
    mockEsClient.get.mockRejectedValue(new Error('connection refused'));

    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(mockContext, improveRequest(), mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });

  it('rejects improvement when no validation feedback is stored', async () => {
    mockEsClient.get.mockResolvedValue({
      _source: { name: 'Test Skill', description: 'd', markdown: '# Test' },
    } as any);

    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(mockContext, improveRequest(), mockResponse);

    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: { message: 'No validation feedback available. Run validation first.' },
    });
  });
});
