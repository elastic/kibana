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
  sampleDocument,
} from './test_helpers';
import { registerListRoute } from './list';
import { CeResultWindowExceededError } from '../services/ce/ce_errors';

describe('registerListRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockCeService: ReturnType<typeof createMockCeService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockCeService = createMockCeService();

    registerListRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getCeService: () => mockCeService as any,
    });

    const [, registeredHandler] = router.get.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (query: Record<string, unknown>, uiSettingsEnabled = true) => {
    const request = httpServerMock.createKibanaRequest({ query });
    const response = httpServerMock.createResponseFactory();
    await handler(buildMockContext(uiSettingsEnabled), request, response);
    return response;
  };

  it('returns 404 when feature flag is disabled', async () => {
    const response = await callHandler({ page: 1, per_page: 20 }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockCeService.listDocuments).not.toHaveBeenCalled();
  });

  it('returns 200 with paginated results and metadata', async () => {
    mockCeService.listDocuments.mockResolvedValue({ total: 1, results: [sampleDocument] });
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    const response = await callHandler({ page: 1, per_page: 20 });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        page: 1,
        per_page: 20,
        items: [expect.objectContaining({ id: sampleDocument.id, origin: sampleDocument.origin })],
      },
    });
  });

  it('filters out unauthorized items', async () => {
    const doc2 = { ...sampleDocument, id: 'entry-2' };
    mockCeService.listDocuments.mockResolvedValue({
      total: 2,
      results: [sampleDocument, doc2],
    });
    mockCeService.checkItemsAccess.mockResolvedValue(
      new Map([
        ['entry-1', true],
        ['entry-2', false],
      ])
    );
    const response = await callHandler({ page: 1, per_page: 20 });
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        items: [expect.objectContaining({ id: sampleDocument.id, origin: sampleDocument.origin })],
      }),
    });
  });

  it('passes filters and pagination to ce.listDocuments', async () => {
    mockCeService.listDocuments.mockResolvedValue({ total: 0, results: [] });
    await callHandler({
      page: 2,
      per_page: 5,
      type: 'dashboard',
      origin_uri: 'dashboard://dash-1',
    });
    expect(mockCeService.listDocuments).toHaveBeenCalledWith({
      spaceId: 'test-space',
      esClient: expect.any(Object),
      page: 2,
      perPage: 5,
      type: 'dashboard',
      originUri: 'dashboard://dash-1',
    });
  });

  it('passes tags filter to ce.listDocuments when provided (comma-delimited)', async () => {
    mockCeService.listDocuments.mockResolvedValue({ total: 0, results: [] });
    await callHandler({ page: 1, per_page: 20, tags: 'otel,claude-code' });
    expect(mockCeService.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['otel', 'claude-code'] })
    );
  });

  it('omits tags from ce.listDocuments when not provided', async () => {
    mockCeService.listDocuments.mockResolvedValue({ total: 0, results: [] });
    await callHandler({ page: 1, per_page: 20 });
    expect(mockCeService.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ tags: undefined })
    );
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerListRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getCeService: () => mockCeService as any,
    });

    const [, localHandler] = localRouter.get.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 20 } });
    const response = httpServerMock.createResponseFactory();

    mockCeService.listDocuments.mockResolvedValue({ total: 0, results: [] });
    await localHandler(buildMockContext(true), request, response);
    expect(mockCeService.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from ce.listDocuments', async () => {
    mockCeService.listDocuments.mockRejectedValue(new Error('boom'));
    await expect(callHandler({ page: 1, per_page: 20 })).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('returns 400 when ce.listDocuments throws CeResultWindowExceededError', async () => {
    mockCeService.listDocuments.mockRejectedValue(
      new CeResultWindowExceededError(
        'Result window is too large, from + size must be less than or equal to: [10000] but was [11000]'
      )
    );
    const response = await callHandler({ page: 11, per_page: 1000 });
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringContaining('Result window is too large') },
    });
  });
});
