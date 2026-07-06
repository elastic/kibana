/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  buildMockContext,
  createMockSmlService,
  createTestCoreSetup,
  createTestCoreSetupNoSpaces,
  httpServerMock,
  httpServiceMock,
} from './test_helpers';
import type { SmlSearchResult } from '../services/sml/types';
import {
  SmlAuthzEnumerationIncompleteError,
  SmlCorpusTooLargeError,
} from '../services/sml/sml_errors';
import { registerSearchRoute } from './search';

describe('registerSearchRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();

    registerSearchRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.post.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (body: Record<string, unknown>, uiSettingsEnabled = true) => {
    const request = httpServerMock.createKibanaRequest({ body });
    const response = httpServerMock.createResponseFactory();
    await handler(buildMockContext(uiSettingsEnabled), request, response);
    return response;
  };

  it('returns 404 when feature flag is disabled', async () => {
    const response = await callHandler({ query: 'test', size: 10 }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.search).not.toHaveBeenCalled();
  });

  it('returns 200 with the hit body when enabled', async () => {
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'visualization',
        title: 'Test Viz',
        origin: { uri: 'viz-1' },
        content: 'test content',
        description: 'A test viz',
        tags: ['demo'],
        references: [{ uri: 'dashboard://abc' }],
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({ query: 'test', size: 10 });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: [
          {
            id: 'chunk-1',
            type: 'visualization',
            origin: { uri: 'viz-1' },
            title: 'Test Viz',
            content: 'test content',
            description: 'A test viz',
            tags: ['demo'],
            references: [{ uri: 'dashboard://abc' }],
          },
        ],
      },
    });
  });

  it('passes fields param to sml.search and omits unrequested fields from the response', async () => {
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'visualization',
        title: 'Test Viz',
        origin: { uri: 'viz-1' },
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({
      query: 'test',
      size: 10,
      fields: ['description'],
    });
    expect(mockSmlService.search).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['description'] })
    );
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0]).not.toHaveProperty('content');
  });

  it('includes permissions in the response when requested via fields', async () => {
    const permissions = {
      kibana: { privileges: [{ name: 'saved_object:dashboard/get' }] },
      elasticsearch: { indices: [{ name: 'metrics-*' }] },
    };
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'dashboard',
        title: 'Test Dashboard',
        origin: { uri: 'dashboard-1' },
        permissions,
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({
      query: 'test',
      size: 10,
      fields: ['permissions'],
    });
    expect(mockSmlService.search).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['permissions'] })
    );
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0].permissions).toEqual(permissions);
  });

  it('omits permissions from the response when the service result has no permissions', async () => {
    // Mirrors what the real service returns when `fields` doesn't include
    // 'permissions': the `permissions` property is absent from the hit
    // entirely (see includePermissions gating in sml_service.ts), not merely
    // undefined. This asserts the route's mapping doesn't add it out of
    // thin air.
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'dashboard',
        title: 'Test Dashboard',
        origin: { uri: 'dashboard-1' },
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({ query: 'test', size: 10 });
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0]).not.toHaveProperty('permissions');
  });

  it('includes spaces, created_at, updated_at, and ingestion_method when requested via fields', async () => {
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'dashboard',
        title: 'Test Dashboard',
        origin: { uri: 'dashboard-1' },
        spaces: ['default'],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        ingestion_method: 'crawled',
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({
      query: 'test',
      size: 10,
      fields: ['spaces', 'created_at', 'updated_at', 'ingestion_method'],
    });
    expect(mockSmlService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ['spaces', 'created_at', 'updated_at', 'ingestion_method'],
      })
    );
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0]).toMatchObject({
      spaces: ['default'],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
      ingestion_method: 'crawled',
    });
  });

  it('omits spaces, created_at, updated_at, and ingestion_method from the response when the service result has none', async () => {
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'dashboard',
        title: 'Test Dashboard',
        origin: { uri: 'dashboard-1' },
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({ query: 'test', size: 10 });
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0]).not.toHaveProperty('spaces');
    expect(results[0]).not.toHaveProperty('created_at');
    expect(results[0]).not.toHaveProperty('updated_at');
    expect(results[0]).not.toHaveProperty('ingestion_method');
  });

  it('passes constraints and agent-supplied filters through to sml.search', async () => {
    mockSmlService.search.mockResolvedValue({ results: [] });
    await callHandler({
      query: 'test',
      constraints: { connector: { ids: ['gh-1'] } },
      filters: { types: ['dashboard'], tags: ['production'] },
    });
    expect(mockSmlService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        constraints: { connector: { ids: ['gh-1'] } },
        filters: { types: ['dashboard'], tags: ['production'] },
      })
    );
  });

  it('passes spaceId from spaces plugin to sml.search', async () => {
    mockSmlService.search.mockResolvedValue({ results: [] });
    await callHandler({ query: 'test' });
    expect(mockSmlService.search).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'test-space' })
    );
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerSearchRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.post.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ body: { query: 'test' } });
    const response = httpServerMock.createResponseFactory();

    mockSmlService.search.mockResolvedValue({ results: [] });
    await localHandler(buildMockContext(true), request, response);
    expect(mockSmlService.search).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.search', async () => {
    mockSmlService.search.mockRejectedValue(new Error('ES connection failed'));
    await expect(callHandler({ query: 'test' })).rejects.toThrow('ES connection failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES connection failed'));
  });

  it('returns 503 when authorization enumeration is incomplete (fail closed)', async () => {
    mockSmlService.search.mockRejectedValue(
      new SmlAuthzEnumerationIncompleteError(
        'Could not complete permission authorization for this search; please retry.'
      )
    );
    const response = await callHandler({ query: 'test' });
    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        body: {
          message: 'Could not complete permission authorization for this search; please retry.',
        },
      })
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SML search authorization unavailable')
    );
  });

  it('returns 503 when the corpus is too large to enumerate (fail closed)', async () => {
    mockSmlService.search.mockRejectedValue(
      new SmlCorpusTooLargeError(
        'Too many distinct permission values to authorize this search; the limit is 100000.'
      )
    );
    const response = await callHandler({ query: 'test' });
    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        body: {
          message:
            'Too many distinct permission values to authorize this search; the limit is 100000.',
        },
      })
    );
  });
});
