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
import { registerDeleteRoute } from './delete';

const validParams = { type: 'visualization', originId: 'viz-1' };

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
    const response = await callHandler(validParams, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockCeService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when origin has no entries anywhere', async () => {
    mockCeService.findByOriginAcrossSpaces.mockResolvedValue([]);
    const response = await callHandler({ type: 'visualization', originId: 'missing' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE origin 'visualization/missing' not found" },
    });
    expect(mockCeService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when origin is owned by another space', async () => {
    const otherSpaceDoc = { ...sampleDocument, spaces: ['other-space'] };
    mockCeService.findByOriginAcrossSpaces.mockResolvedValue([otherSpaceDoc]);

    const response = await callHandler(validParams);

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE origin 'visualization/viz-1' not found" },
    });
    expect(mockCeService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when caller cannot access every entry', async () => {
    mockCeService.findByOriginAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, false]]));

    const response = await callHandler(validParams);

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE origin 'visualization/viz-1' not found" },
    });
    expect(mockCeService.deleteAttachment).not.toHaveBeenCalled();
  });

  it('deletes every entry for the origin with ingestionMethod=all', async () => {
    mockCeService.findByOriginAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockCeService.deleteAttachment.mockResolvedValue(undefined);

    const response = await callHandler(validParams);

    expect(mockCeService.deleteAttachment).toHaveBeenCalledTimes(1);
    expect(mockCeService.deleteAttachment).toHaveBeenCalledWith(
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

  it('targets only the URL-pinned type even if entries of other types share the bare id', async () => {
    const vizEntry = { ...sampleDocument, id: 'entry-1', type: 'visualization' };
    mockCeService.findByOriginAcrossSpaces.mockResolvedValue([vizEntry]);
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([[vizEntry.id, true]]));
    mockCeService.deleteAttachment.mockResolvedValue(undefined);

    await callHandler(validParams);

    expect(mockCeService.deleteAttachment).toHaveBeenCalledTimes(1);
    expect(mockCeService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentType: 'visualization' })
    );
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
    const request = httpServerMock.createKibanaRequest({ params: validParams });
    const response = httpServerMock.createResponseFactory();

    const defaultSpaceDoc = { ...sampleDocument, spaces: ['default'] };
    mockCeService.findByOriginAcrossSpaces.mockResolvedValue([defaultSpaceDoc]);
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([[defaultSpaceDoc.id, true]]));
    mockCeService.deleteAttachment.mockResolvedValue(undefined);

    await localHandler(buildMockContext(true), request, response);

    expect(mockCeService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ spaces: ['default'] })
    );
  });

  it('propagates errors from ce.deleteAttachment', async () => {
    mockCeService.findByOriginAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));
    mockCeService.deleteAttachment.mockRejectedValue(new Error('boom'));

    await expect(callHandler(validParams)).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
