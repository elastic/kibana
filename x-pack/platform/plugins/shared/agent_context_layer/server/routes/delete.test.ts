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
    const response = await callHandler({ originId: 'viz-1' }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when origin has no chunks anywhere', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    const response = await callHandler({ originId: 'missing' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'missing' not found" },
    });
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when origin is owned by another space', async () => {
    const otherSpaceDoc = { ...sampleDocument, spaces: ['other-space'] };
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([otherSpaceDoc]);

    const response = await callHandler({ originId: 'viz-1' });

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'viz-1' not found" },
    });
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when caller cannot access every chunk', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, false]]));

    const response = await callHandler({ originId: 'viz-1' });

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'viz-1' not found" },
    });
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('deletes every chunk for the origin with ingestionMethod=all', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockSmlService.deleteAttachment.mockResolvedValue(undefined);

    const response = await callHandler({ originId: 'viz-1' });

    expect(mockSmlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        originId: 'viz-1',
        attachmentType: 'visualization',
        spaces: ['test-space'],
        ingestionMethod: 'all',
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { origin_id: 'viz-1', deleted: true },
    });
  });

  it('dispatches a separate delete per type when the origin spans multiple types', async () => {
    const vizChunk = { ...sampleDocument, id: 'chunk-1', type: 'visualization' };
    const dashChunk = { ...sampleDocument, id: 'chunk-2', type: 'dashboard' };
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([vizChunk, dashChunk]);
    mockSmlService.checkItemsAccess.mockResolvedValue(
      new Map([
        [vizChunk.id, true],
        [dashChunk.id, true],
      ])
    );
    mockSmlService.deleteAttachment.mockResolvedValue(undefined);

    await callHandler({ originId: 'viz-1' });

    expect(mockSmlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentType: 'visualization' })
    );
    expect(mockSmlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentType: 'dashboard' })
    );
    expect(mockSmlService.deleteAttachment).toHaveBeenCalledTimes(2);
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
    const request = httpServerMock.createKibanaRequest({ params: { originId: 'viz-1' } });
    const response = httpServerMock.createResponseFactory();

    const defaultSpaceDoc = { ...sampleDocument, spaces: ['default'] };
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([defaultSpaceDoc]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[defaultSpaceDoc.id, true]]));
    mockSmlService.deleteAttachment.mockResolvedValue(undefined);

    await localHandler(buildMockContext(true), request, response);

    expect(mockSmlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ spaces: ['default'] })
    );
  });

  it('propagates errors from sml.deleteAttachment', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockSmlService.deleteAttachment.mockRejectedValue(new Error('boom'));

    await expect(callHandler({ originId: 'viz-1' })).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
