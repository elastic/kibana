/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  buildMockContext,
  createMockContextEngineService,
  createTestCoreSetup,
  createTestCoreSetupNoSpaces,
  httpServerMock,
  httpServiceMock,
} from './test_helpers';
import type { ContextEngineSearchResult } from '../services/engine/types';
import {
  ContextEngineAuthzEnumerationIncompleteError,
  ContextEngineCorpusTooLargeError,
} from '../services/engine/errors';
import { registerSearchRoute } from './search';

describe('registerSearchRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockContextEngineService: ReturnType<typeof createMockContextEngineService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockContextEngineService = createMockContextEngineService();

    registerSearchRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getContextEngineService: () => mockContextEngineService as any,
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
    expect(mockContextEngineService.search).not.toHaveBeenCalled();
  });

  it('returns 200 with the hit body when enabled', async () => {
    const mockResults: ContextEngineSearchResult[] = [
      {
        id: 'entry-1',
        type: 'visualization',
        title: 'Test Viz',
        origin: { uri: 'viz-1' },
        content: 'test content',
        description: 'A test viz',
        tags: ['demo'],
        references: [{ uri: 'dashboard://abc' }],
      },
    ];
    mockContextEngineService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({ query: 'test', size: 10 });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: [
          {
            id: 'entry-1',
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

  it('passes fields param to contextEngine.search and omits unrequested fields from the response', async () => {
    const mockResults: ContextEngineSearchResult[] = [
      {
        id: 'entry-1',
        type: 'visualization',
        title: 'Test Viz',
        origin: { uri: 'viz-1' },
      },
    ];
    mockContextEngineService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({
      query: 'test',
      size: 10,
      fields: ['description'],
    });
    expect(mockContextEngineService.search).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['description'] })
    );
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0]).not.toHaveProperty('content');
  });

  it('passes constraints and agent-supplied filters through to contextEngine.search', async () => {
    mockContextEngineService.search.mockResolvedValue({ results: [] });
    await callHandler({
      query: 'test',
      constraints: { connector: { ids: ['gh-1'] } },
      filters: { types: ['dashboard'], tags: ['production'] },
    });
    expect(mockContextEngineService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        constraints: { connector: { ids: ['gh-1'] } },
        filters: { types: ['dashboard'], tags: ['production'] },
      })
    );
  });

  it('passes spaceId from spaces plugin to contextEngine.search', async () => {
    mockContextEngineService.search.mockResolvedValue({ results: [] });
    await callHandler({ query: 'test' });
    expect(mockContextEngineService.search).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'test-space' })
    );
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerSearchRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getContextEngineService: () => mockContextEngineService as any,
    });

    const [, localHandler] = localRouter.post.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ body: { query: 'test' } });
    const response = httpServerMock.createResponseFactory();

    mockContextEngineService.search.mockResolvedValue({ results: [] });
    await localHandler(buildMockContext(true), request, response);
    expect(mockContextEngineService.search).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from contextEngine.search', async () => {
    mockContextEngineService.search.mockRejectedValue(new Error('ES connection failed'));
    await expect(callHandler({ query: 'test' })).rejects.toThrow('ES connection failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES connection failed'));
  });

  it('returns 503 when authorization enumeration is incomplete (fail closed)', async () => {
    mockContextEngineService.search.mockRejectedValue(
      new ContextEngineAuthzEnumerationIncompleteError(
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
      expect.stringContaining('Context Engine search authorization unavailable')
    );
  });

  it('returns 503 when the corpus is too large to enumerate (fail closed)', async () => {
    mockContextEngineService.search.mockRejectedValue(
      new ContextEngineCorpusTooLargeError(
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
