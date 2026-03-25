/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createFieldsRoute } from './fields';

const mockFieldCaps = jest.fn();

const mockContext = {
  core: Promise.resolve({
    elasticsearch: {
      client: {
        asCurrentUser: {
          fieldCaps: mockFieldCaps,
        },
      },
    },
  }),
} as unknown as RequestHandlerContext;

describe('createFieldsRoute', () => {
  const logger = loggingSystemMock.create().get();
  const router = httpServiceMock.createRouter();

  beforeEach(() => {
    jest.clearAllMocks();
    createFieldsRoute(logger, router, '/internal/triggers_actions_ui/data');
  });

  const getHandler = () => {
    const [, handler] = router.post.mock.calls[0];
    return handler;
  };

  test('registers POST route at /_fields', () => {
    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/internal/triggers_actions_ui/data/_fields');
  });

  test('returns empty fields for empty indexPatterns', async () => {
    const handler = getHandler();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { indexPatterns: [] },
    });

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: { fields: [] } });
    expect(mockFieldCaps).not.toHaveBeenCalled();
  });

  test('calls fieldCaps without project_routing when not provided', async () => {
    mockFieldCaps.mockResolvedValueOnce({
      fields: {
        '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } },
      },
    });

    const handler = getHandler();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { indexPatterns: ['test-*'] },
    });

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockFieldCaps).toHaveBeenCalledWith({
      index: ['test-*'],
      fields: ['*'],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        fields: [
          {
            name: '@timestamp',
            type: 'date',
            normalizedType: 'date',
            searchable: true,
            aggregatable: true,
          },
        ],
      },
    });
  });

  test('calls fieldCaps with project_routing when provided', async () => {
    const projectRouting = '_alias:my-project-id';
    mockFieldCaps.mockResolvedValueOnce({
      fields: {
        '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } },
      },
    });

    const handler = getHandler();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { indexPatterns: ['cps*'], projectRouting },
    });

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockFieldCaps).toHaveBeenCalledWith({
      index: ['cps*'],
      fields: ['*'],
      ignore_unavailable: true,
      allow_no_indices: true,
      project_routing: projectRouting,
    });
  });

  test('returns empty fields when fieldCaps throws', async () => {
    mockFieldCaps.mockRejectedValueOnce(new Error('index_not_found'));

    const handler = getHandler();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { indexPatterns: ['missing-*'] },
    });

    await handler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: { fields: [] } });
    expect(logger.warn).toHaveBeenCalled();
  });
});
