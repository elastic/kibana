/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, coreMock } from '@kbn/core/server/mocks';
import { SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { registerSearchRoute } from './search';

const createMockSmlService = () => ({
  search: jest.fn().mockResolvedValue({
    total: 1,
    results: [
      {
        id: 'chunk-1',
        type: 'visualization',
        origin_id: 'viz-1',
        title: 'CPU Chart',
        content: 'Chart content',
        score: 0.95,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: [],
      },
    ],
  }),
  checkItemsAccess: jest.fn(),
  indexAttachment: jest.fn(),
  getDocuments: jest.fn(),
  getTypeDefinition: jest.fn(),
  listTypeDefinitions: jest.fn(),
  getCrawler: jest.fn(),
});

describe('registerSearchRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let mockSmlService: ReturnType<typeof createMockSmlService>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: { spacesService: { getSpaceId: () => 'default' } } },
      {},
    ]);

    registerSearchRoute({
      router: router as any,
      logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } as any,
      coreSetup: coreSetup as any,
      getSmlService: () => mockSmlService as any,
    });
  });

  it('registers a POST route at /internal/semantic_layer/sml/_search', () => {
    expect(router.post).toHaveBeenCalledTimes(1);
    const [routeConfig] = router.post.mock.calls[0];
    expect(routeConfig.path).toBe('/internal/semantic_layer/sml/_search');
  });

  it('returns 403 when feature flag is disabled', async () => {
    const [, handler] = router.post.mock.calls[0];
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { query: 'test', size: 10 },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockContext = {
      core: Promise.resolve({
        uiSettings: {
          client: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID) return false;
              return false;
            }),
          },
        },
        elasticsearch: { client: { asCurrentUser: {} } },
      }),
    };

    await handler(mockContext as any, mockRequest, mockResponse);

    expect(mockResponse.forbidden).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('not enabled'),
        }),
      })
    );
  });

  it('returns search results with correct shape when flag is enabled', async () => {
    const [, handler] = router.post.mock.calls[0];
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { query: 'cpu', size: 10 },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockContext = {
      core: Promise.resolve({
        uiSettings: {
          client: {
            get: jest.fn().mockResolvedValue(true),
          },
        },
        elasticsearch: { client: { asCurrentUser: {} } },
      }),
    };

    await handler(mockContext as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    const body = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(body.total).toBe(1);
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toEqual({
      id: 'chunk-1',
      type: 'visualization',
      origin_id: 'viz-1',
      title: 'CPU Chart',
      content: 'Chart content',
      score: 0.95,
    });
  });

  it('omits content when skip_content is true', async () => {
    mockSmlService.search.mockResolvedValue({
      total: 1,
      results: [
        {
          id: 'chunk-1',
          type: 'visualization',
          origin_id: 'viz-1',
          title: 'CPU Chart',
          content: 'Chart content',
          score: 0.95,
        },
      ],
    });
    const [, handler] = router.post.mock.calls[0];
    const mockRequest = httpServerMock.createKibanaRequest({
      body: { query: 'cpu', size: 10, skip_content: true },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockContext = {
      core: Promise.resolve({
        uiSettings: {
          client: {
            get: jest.fn().mockResolvedValue(true),
          },
        },
        elasticsearch: { client: { asCurrentUser: {} } },
      }),
    };

    await handler(mockContext as any, mockRequest, mockResponse);

    const body = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(body.results[0].content).toBeUndefined();
  });
});
