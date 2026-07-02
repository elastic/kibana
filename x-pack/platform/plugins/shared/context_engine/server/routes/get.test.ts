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
import { registerGetRoute } from './get';

const validParams = { type: 'visualization', originId: 'viz-1' };

describe('registerGetRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockCeService: ReturnType<typeof createMockCeService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockCeService = createMockCeService();

    registerGetRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getCeService: () => mockCeService as any,
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
    const response = await callHandler(validParams, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockCeService.findByOrigin).not.toHaveBeenCalled();
  });

  it('returns 404 when no entries exist for the origin', async () => {
    mockCeService.findByOrigin.mockResolvedValue([]);
    const response = await callHandler({ type: 'visualization', originId: 'missing' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE origin 'visualization/missing' not found" },
    });
    expect(mockCeService.checkItemsAccess).not.toHaveBeenCalled();
  });

  it('returns 404 when every entry is unauthorized', async () => {
    mockCeService.findByOrigin.mockResolvedValue([sampleDocument]);
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, false]]));
    const response = await callHandler(validParams);
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE origin 'visualization/viz-1' not found" },
    });
  });

  it('returns 200 with every authorized entry for the origin', async () => {
    const secondEntry = { ...sampleDocument, id: 'entry-2' };
    mockCeService.findByOrigin.mockResolvedValue([sampleDocument, secondEntry]);
    mockCeService.checkItemsAccess.mockResolvedValue(
      new Map([
        [sampleDocument.id, true],
        [secondEntry.id, true],
      ])
    );

    const response = await callHandler(validParams);

    // Both `type` and `originId` flow from the URL into the lookup —
    // the service hashes them into the canonical `origin.uri`.
    expect(mockCeService.findByOrigin).toHaveBeenCalledWith({
      type: 'visualization',
      originId: 'viz-1',
      spaceId: 'test-space',
      esClient: expect.any(Object),
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        items: [
          expect.objectContaining({ id: sampleDocument.id }),
          expect.objectContaining({ id: secondEntry.id }),
        ],
      },
    });
  });

  it('drops entries the caller is not authorized to see', async () => {
    const secondEntry = { ...sampleDocument, id: 'entry-2' };
    mockCeService.findByOrigin.mockResolvedValue([sampleDocument, secondEntry]);
    mockCeService.checkItemsAccess.mockResolvedValue(
      new Map([
        [sampleDocument.id, true],
        [secondEntry.id, false],
      ])
    );

    const response = await callHandler(validParams);

    const body = response.ok.mock.calls[0][0]?.body as { items: Array<{ id: string }> };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.id).toBe(sampleDocument.id);
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerGetRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getCeService: () => mockCeService as any,
    });

    const [, localHandler] = localRouter.get.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ params: validParams });
    const response = httpServerMock.createResponseFactory();

    mockCeService.findByOrigin.mockResolvedValue([sampleDocument]);
    mockCeService.checkItemsAccess.mockResolvedValue(new Map([[sampleDocument.id, true]]));

    await localHandler(buildMockContext(true), request, response);

    expect(mockCeService.findByOrigin).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from ce.findByOrigin', async () => {
    mockCeService.findByOrigin.mockRejectedValue(new Error('ES connection failed'));
    await expect(callHandler(validParams)).rejects.toThrow('ES connection failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES connection failed'));
  });
});
