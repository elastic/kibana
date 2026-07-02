/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  buildMockContext,
  createMockCeService,
  createTestCoreSetup,
  createTestCoreSetupNoSpaces,
  httpServerMock,
  httpServiceMock,
} from './test_helpers';
import type { CeSearchResult } from '../services/ce/types';
import { CeAuthzEnumerationIncompleteError, CeCorpusTooLargeError } from '../services/ce/ce_errors';
import { registerSearchRoute } from './search';

describe('registerSearchRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockCeService: ReturnType<typeof createMockCeService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockCeService = createMockCeService();

    registerSearchRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getCeService: () => mockCeService as any,
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
    expect(mockCeService.search).not.toHaveBeenCalled();
  });

  it('returns 200 with the hit body when enabled', async () => {
    const mockResults: CeSearchResult[] = [
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
    mockCeService.search.mockResolvedValue({ results: mockResults });

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

  it('passes fields param to ce.search and omits unrequested fields from the response', async () => {
    const mockResults: CeSearchResult[] = [
      {
        id: 'entry-1',
        type: 'visualization',
        title: 'Test Viz',
        origin: { uri: 'viz-1' },
      },
    ];
    mockCeService.search.mockResolvedValue({ results: mockResults });

    const response = await callHandler({
      query: 'test',
      size: 10,
      fields: ['description'],
    });
    expect(mockCeService.search).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['description'] })
    );
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0]).not.toHaveProperty('content');
  });

  it('passes constraints and agent-supplied filters through to ce.search', async () => {
    mockCeService.search.mockResolvedValue({ results: [] });
    await callHandler({
      query: 'test',
      constraints: { connector: { ids: ['gh-1'] } },
      filters: { types: ['dashboard'], tags: ['production'] },
    });
    expect(mockCeService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        constraints: { connector: { ids: ['gh-1'] } },
        filters: { types: ['dashboard'], tags: ['production'] },
      })
    );
  });

  it('passes spaceId from spaces plugin to ce.search', async () => {
    mockCeService.search.mockResolvedValue({ results: [] });
    await callHandler({ query: 'test' });
    expect(mockCeService.search).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'test-space' })
    );
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerSearchRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getCeService: () => mockCeService as any,
    });

    const [, localHandler] = localRouter.post.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ body: { query: 'test' } });
    const response = httpServerMock.createResponseFactory();

    mockCeService.search.mockResolvedValue({ results: [] });
    await localHandler(buildMockContext(true), request, response);
    expect(mockCeService.search).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from ce.search', async () => {
    mockCeService.search.mockRejectedValue(new Error('ES connection failed'));
    await expect(callHandler({ query: 'test' })).rejects.toThrow('ES connection failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES connection failed'));
  });

  it('returns 503 when authorization enumeration is incomplete (fail closed)', async () => {
    mockCeService.search.mockRejectedValue(
      new CeAuthzEnumerationIncompleteError(
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
      expect.stringContaining('CE search authorization unavailable')
    );
  });

  it('returns 503 when the corpus is too large to enumerate (fail closed)', async () => {
    mockCeService.search.mockRejectedValue(
      new CeCorpusTooLargeError(
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
