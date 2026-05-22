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
import { registerDeleteRoute } from './delete';

describe('registerDeleteRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();

    registerDeleteRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.delete.mock.calls[0];
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
    expect(mockSmlService.deleteDocument).not.toHaveBeenCalled();
  });

  it('returns 404 when access check denies the item', async () => {
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));
    const response = await callHandler({ id: 'chunk-1' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML document 'chunk-1' not found" },
    });
    expect(mockSmlService.deleteDocument).not.toHaveBeenCalled();
  });

  it('returns 404 when no matching document exists', async () => {
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['missing', true]]));
    mockSmlService.deleteDocument.mockResolvedValue(false);
    const response = await callHandler({ id: 'missing' });
    expect(mockSmlService.deleteDocument).toHaveBeenCalledWith({
      id: 'missing',
      spaceId: 'test-space',
      esClient: expect.any(Object),
    });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML document 'missing' not found" },
    });
  });

  it('returns 200 with deleted=true when delete succeeds', async () => {
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockSmlService.deleteDocument.mockResolvedValue(true);
    const response = await callHandler({ id: 'chunk-1' });
    expect(response.ok).toHaveBeenCalledWith({
      body: { id: 'chunk-1', deleted: true },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerDeleteRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.delete.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ params: { id: 'chunk-1' } });
    const response = httpServerMock.createResponseFactory();

    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockSmlService.deleteDocument.mockResolvedValue(true);
    await localHandler(buildMockContext(true), request, response);
    expect(mockSmlService.deleteDocument).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.deleteDocument', async () => {
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockSmlService.deleteDocument.mockRejectedValue(new Error('boom'));
    await expect(callHandler({ id: 'chunk-1' })).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
