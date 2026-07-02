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
import { registerDeleteRoute } from './delete';

describe('registerDeleteRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockCeService: ReturnType<typeof createMockCeService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockCeService = createMockCeService();

    registerDeleteRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getCeService: () => mockCeService as any,
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
    const response = await callHandler({ id: 'entry-1' }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockCeService.deleteDocument).not.toHaveBeenCalled();
  });

  it('returns 404 when access check denies the item', async () => {
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([['entry-1', false]]));
    const response = await callHandler({ id: 'entry-1' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE document 'entry-1' not found" },
    });
    expect(mockCeService.deleteDocument).not.toHaveBeenCalled();
  });

  it('returns 404 when no matching document exists', async () => {
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([['missing', true]]));
    mockCeService.deleteDocument.mockResolvedValue(false);
    const response = await callHandler({ id: 'missing' });
    expect(mockCeService.deleteDocument).toHaveBeenCalledWith({
      id: 'missing',
      spaceId: 'test-space',
      esClient: expect.any(Object),
    });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE document 'missing' not found" },
    });
  });

  it('returns 200 with deleted=true when delete succeeds', async () => {
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockCeService.deleteDocument.mockResolvedValue(true);
    const response = await callHandler({ id: 'entry-1' });
    expect(response.ok).toHaveBeenCalledWith({
      body: { id: 'entry-1', deleted: true },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerDeleteRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getCeService: () => mockCeService as any,
    });

    const [, localHandler] = localRouter.delete.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ params: { id: 'entry-1' } });
    const response = httpServerMock.createResponseFactory();

    mockCeService.checkItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockCeService.deleteDocument.mockResolvedValue(true);
    await localHandler(buildMockContext(true), request, response);
    expect(mockCeService.deleteDocument).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from ce.deleteDocument', async () => {
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockCeService.deleteDocument.mockRejectedValue(new Error('boom'));
    await expect(callHandler({ id: 'entry-1' })).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
