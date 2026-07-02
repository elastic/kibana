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
import { registerUpsertRoute } from './upsert';

const validBody = {
  type: 'visualization',
  title: 'Test Viz',
  origin_id: 'viz-1',
  content: 'some content',
};

describe('registerUpsertRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockCeService: ReturnType<typeof createMockCeService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockCeService = createMockCeService();

    registerUpsertRoute({
      router: router as any,
      coreSetup: createTestCoreSetup() as any,
      logger,
      getCeService: () => mockCeService as any,
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
    const response = await callHandler({ params: { id: 'entry-1' }, body: validBody }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockCeService.upsertDocument).not.toHaveBeenCalled();
  });

  it('returns 200 with the new document when created', async () => {
    mockCeService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: true });
    const response = await callHandler({ params: { id: 'entry-1' }, body: validBody });
    expect(mockCeService.upsertDocument).toHaveBeenCalledWith({
      id: 'entry-1',
      spaceId: 'test-space',
      document: validBody,
      esClient: expect.any(Object),
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        item: expect.objectContaining({ id: sampleDocument.id, origin: sampleDocument.origin }),
        created: true,
      },
    });
  });

  it('forwards permissions to ce.upsertDocument when provided', async () => {
    mockCeService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: true });
    const bodyWithPermissions = {
      ...validBody,
      permissions: {
        kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
        elasticsearch: {
          indices: [{ name: 'logs-app-*' }, { name: 'metrics-prod' }],
        },
      },
    };
    await callHandler({ params: { id: 'entry-1' }, body: bodyWithPermissions });
    expect(mockCeService.upsertDocument).toHaveBeenCalledWith({
      id: 'entry-1',
      spaceId: 'test-space',
      document: bodyWithPermissions,
      esClient: expect.any(Object),
    });
  });

  it('forwards tags to ce.upsertDocument when provided', async () => {
    mockCeService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: true });
    const bodyWithTags = {
      ...validBody,
      tags: ['otel', 'claude-code'],
    };
    await callHandler({ params: { id: 'entry-1' }, body: bodyWithTags });
    expect(mockCeService.upsertDocument).toHaveBeenCalledWith({
      id: 'entry-1',
      spaceId: 'test-space',
      document: expect.objectContaining({ tags: ['otel', 'claude-code'] }),
      esClient: expect.any(Object),
    });
  });

  it('returns 200 with created=false when the document already existed', async () => {
    mockCeService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: false });
    const response = await callHandler({ params: { id: 'entry-1' }, body: validBody });
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    expect(body.created).toBe(false);
    expect(body.item).toEqual(
      expect.objectContaining({ id: sampleDocument.id, origin: sampleDocument.origin })
    );
  });

  it('returns 404 when the document exists in another space', async () => {
    mockCeService.upsertDocument.mockResolvedValue(null);
    const response = await callHandler({ params: { id: 'entry-1' }, body: validBody });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "CE document 'entry-1' not found" },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const localRouter = httpServiceMock.createRouter();
    registerUpsertRoute({
      router: localRouter as any,
      coreSetup: createTestCoreSetupNoSpaces() as any,
      logger,
      getCeService: () => mockCeService as any,
    });

    const [, localHandler] = localRouter.put.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({
      params: { id: 'entry-1' },
      body: validBody,
    });
    const response = httpServerMock.createResponseFactory();

    mockCeService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: true });
    await localHandler(buildMockContext(true), request, response);
    expect(mockCeService.upsertDocument).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from ce.upsertDocument', async () => {
    mockCeService.upsertDocument.mockRejectedValue(new Error('write failed'));
    await expect(callHandler({ params: { id: 'entry-1' }, body: validBody })).rejects.toThrow(
      'write failed'
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('write failed'));
  });
});
