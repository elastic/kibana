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
  sampleDocument,
} from './test_helpers';
import { registerGetRoute } from './get';

describe('registerGetRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();

    registerGetRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.get.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (params: Record<string, unknown>, uiSettingsEnabled = true) => {
    const request = httpServerMock.createKibanaRequest({ params });
    const response = httpServerMock.createResponseFactory();
    await handler(buildMockContext(uiSettingsEnabled), request, response);
    return response;
  };

  it('returns 404 when feature flag is disabled', async () => {
    const response = await callHandler({ id: 'chunk-1' }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.getDocuments).not.toHaveBeenCalled();
  });

  it('returns 404 when the document is not found', async () => {
    mockSmlService.getDocuments.mockResolvedValue(new Map());
    const response = await callHandler({ id: 'missing' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML document 'missing' not found" },
    });
  });

  it('returns 404 when access check denies the item', async () => {
    mockSmlService.getDocuments.mockResolvedValue(new Map([['chunk-1', sampleDocument]]));
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));
    const response = await callHandler({ id: 'chunk-1' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML document 'chunk-1' not found" },
    });
  });

  it('returns 200 with the document when found and authorized', async () => {
    mockSmlService.getDocuments.mockResolvedValue(new Map([['chunk-1', sampleDocument]]));
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    const response = await callHandler({ id: 'chunk-1' });
    expect(mockSmlService.getDocuments).toHaveBeenCalledWith({
      ids: ['chunk-1'],
      spaceId: 'test-space',
      esClient: expect.any(Object),
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { item: sampleDocument },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerGetRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.get.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ params: { id: 'chunk-1' } });
    const response = httpServerMock.createResponseFactory();

    mockSmlService.getDocuments.mockResolvedValue(new Map([['chunk-1', sampleDocument]]));
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    await localHandler(buildMockContext(true), request, response);
    expect(mockSmlService.getDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.getDocuments', async () => {
    mockSmlService.getDocuments.mockRejectedValue(new Error('ES connection failed'));
    await expect(callHandler({ id: 'chunk-1' })).rejects.toThrow('ES connection failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES connection failed'));
  });
});
