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

const validParams = { type: 'visualization', originId: 'viz-1' };

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
    const response = await callHandler(validParams, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when origin has no chunks anywhere', async () => {
    mockSmlService.findByOriginAcrossSpaces.mockResolvedValue([]);
    const response = await callHandler({ type: 'visualization', originId: 'missing' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'visualization/missing' not found" },
    });
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when origin is owned by another space', async () => {
    const otherSpaceDoc = { ...sampleDocument, spaces: ['other-space'] };
    mockSmlService.findByOriginAcrossSpaces.mockResolvedValue([otherSpaceDoc]);

    const response = await callHandler(validParams);

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'visualization/viz-1' not found" },
    });
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when caller cannot access every chunk', async () => {
    mockSmlService.findByOriginAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, false]]));

    const response = await callHandler(validParams);

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'visualization/viz-1' not found" },
    });
    expect(mockSmlService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('deletes every chunk for the origin with ingestionMethod=all', async () => {
    mockSmlService.findByOriginAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockSmlService.deleteAttachment.mockResolvedValue(undefined);

    const response = await callHandler(validParams);

    // Single delete — `type` is pinned by the URL. No multi-type
    // fan-out; the previous version of this route discovered `type`
    // by enumerating chunks and looped, which was a side-effect of
    // the (now removed) `/sml/{originId}` URL shape.
    expect(mockSmlService.deleteAttachment).toHaveBeenCalledTimes(1);
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

  it('targets only the URL-pinned type even if chunks of other types share the bare id', async () => {
    // With `type` in the URL, the route never needs to enumerate
    // types — the `findByOriginAcrossSpaces` query is already scoped
    // by `origin.uri = ${type}://${originId}`. This test pins the
    // contract that a DELETE for `visualization/viz-1` will never
    // touch a `dashboard/viz-1` chunk that legitimately shares the
    // bare id. The mock service returns only what the canonical URI
    // would match, so the route's behaviour reduces to: one delete,
    // exactly one `attachmentType`.
    const vizChunk = { ...sampleDocument, id: 'chunk-1', type: 'visualization' };
    mockSmlService.findByOriginAcrossSpaces.mockResolvedValue([vizChunk]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[vizChunk.id, true]]));
    mockSmlService.deleteAttachment.mockResolvedValue(undefined);

    await callHandler(validParams);

    expect(mockSmlService.deleteAttachment).toHaveBeenCalledTimes(1);
    expect(mockSmlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentType: 'visualization' })
    );
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
    const request = httpServerMock.createKibanaRequest({ params: validParams });
    const response = httpServerMock.createResponseFactory();

    const defaultSpaceDoc = { ...sampleDocument, spaces: ['default'] };
    mockSmlService.findByOriginAcrossSpaces.mockResolvedValue([defaultSpaceDoc]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[defaultSpaceDoc.id, true]]));
    mockSmlService.deleteAttachment.mockResolvedValue(undefined);

    await localHandler(buildMockContext(true), request, response);

    expect(mockSmlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ spaces: ['default'] })
    );
  });

  it('propagates errors from sml.deleteAttachment', async () => {
    mockSmlService.findByOriginAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockSmlService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockSmlService.deleteAttachment.mockRejectedValue(new Error('boom'));

    await expect(callHandler(validParams)).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
