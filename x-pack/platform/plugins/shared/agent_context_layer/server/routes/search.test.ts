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

  it('returns 200 with search results when enabled', async () => {
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'visualization',
        title: 'Test Viz',
        origin_id: 'viz-1',
        content: 'some content',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['test-space'],
        permissions: [],
        score: 1.5,
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults, total: 1 });

    const response = await callHandler({ query: 'test', size: 10 });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        total: 1,
        results: [
          {
            id: 'chunk-1',
            type: 'visualization',
            origin_id: 'viz-1',
            title: 'Test Viz',
            score: 1.5,
            content: 'some content',
          },
        ],
      },
    });
  });

  it('omits content field when skip_content is true', async () => {
    const mockResults: SmlSearchResult[] = [
      {
        id: 'chunk-1',
        type: 'visualization',
        title: 'Test Viz',
        origin_id: 'viz-1',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['test-space'],
        permissions: [],
        score: 1.5,
      },
    ];
    mockSmlService.search.mockResolvedValue({ results: mockResults, total: 1 });

    const response = await callHandler({ query: 'test', size: 10, skip_content: true });
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const results = (body as any).results;
    expect(results[0]).not.toHaveProperty('content');
  });

  it('passes spaceId from spaces plugin to sml.search', async () => {
    mockSmlService.search.mockResolvedValue({ results: [], total: 0 });
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

    mockSmlService.search.mockResolvedValue({ results: [], total: 0 });
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
});
