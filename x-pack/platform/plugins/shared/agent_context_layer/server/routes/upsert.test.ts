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
import { registerUpsertRoute } from './upsert';
import { SmlUnregisteredTypeError } from '../services/sml/sml_errors';

const validBody = {
  type: 'visualization',
  title: 'Test Viz',
  content: 'some content',
};

describe('registerUpsertRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();

    registerUpsertRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.put.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (
    { params, body }: { params: Record<string, unknown>; body: Record<string, unknown> },
    uiSettingsEnabled = true
  ) => {
    const request = httpServerMock.createKibanaRequest({ params, body });
    const response = httpServerMock.createResponseFactory();
    await handler(buildMockContext(uiSettingsEnabled), request, response);
    return response;
  };

  it('returns 404 when feature flag is disabled', async () => {
    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('creates a new origin via indexAttachment content-mode when no chunks exist', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        originId: 'viz-1',
        attachmentType: 'visualization',
        action: 'create',
        spaces: ['test-space'],
        content: [
          expect.objectContaining({
            type: 'visualization',
            title: 'Test Viz',
            content: 'some content',
          }),
        ],
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        items: [expect.objectContaining({ id: sampleDocument.id, origin: sampleDocument.origin })],
        created: true,
      },
    });
  });

  it('passes action=update and created=false when origin already exists in caller space', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([sampleDocument]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update' })
    );
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    expect(body.created).toBe(false);
  });

  it('forwards tags to the indexer when provided', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);
    const bodyWithTags = { ...validBody, tags: ['otel', 'claude-code'] };

    await callHandler({ params: { originId: 'viz-1' }, body: bodyWithTags });

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        content: [expect.objectContaining({ tags: ['otel', 'claude-code'] })],
      })
    );
  });

  it('returns 404 when origin is owned by another space', async () => {
    const otherSpaceDoc = { ...sampleDocument, spaces: ['other-space'] };
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([otherSpaceDoc]);

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML origin 'viz-1' not found" },
    });
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('returns 400 when the SML type is not registered', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockRejectedValue(
      new SmlUnregisteredTypeError("type 'wat' not registered")
    );

    const response = await callHandler({ params: { originId: 'viz-1' }, body: validBody });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: "type 'wat' not registered" },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerUpsertRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.put.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({
      params: { originId: 'viz-1' },
      body: validBody,
    });
    const response = httpServerMock.createResponseFactory();

    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockResolvedValue(undefined);
    mockSmlService.findByOriginId.mockResolvedValue([sampleDocument]);

    await localHandler(buildMockContext(true), request, response);

    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ spaces: ['default'] })
    );
  });

  it('propagates unexpected errors from sml.indexAttachment', async () => {
    mockSmlService.findByOriginIdAcrossSpaces.mockResolvedValue([]);
    mockSmlService.indexAttachment.mockRejectedValue(new Error('write failed'));

    await expect(callHandler({ params: { originId: 'viz-1' }, body: validBody })).rejects.toThrow(
      'write failed'
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('write failed'));
  });
});
