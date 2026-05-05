/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { SmlDocument } from '../services/sml/types';
import { registerUpsertRoute } from './upsert';

const createMockSmlService = () => ({
  search: jest.fn(),
  checkItemsAccess: jest.fn(),
  indexAttachment: jest.fn(),
  getDocuments: jest.fn(),
  getDocument: jest.fn(),
  listDocuments: jest.fn(),
  upsertDocument: jest.fn(),
  deleteDocument: jest.fn(),
  getTypeDefinition: jest.fn(),
  listTypeDefinitions: jest.fn(),
  getCrawler: jest.fn(),
});

const createMockUiSettingsClient = (enabled = true) => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    if (key === AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID) return enabled;
    return undefined;
  }),
});

const sampleDocument: SmlDocument = {
  id: 'chunk-1',
  type: 'visualization',
  title: 'Test Viz',
  origin_id: 'viz-1',
  content: 'some content',
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
  spaces: ['test-space'],
  permissions: [],
};

const validBody = {
  type: 'visualization',
  title: 'Test Viz',
  origin_id: 'viz-1',
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

    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('test-space') } } },
      {},
    ]);

    registerUpsertRoute({
      router: router as any,
      coreSetup: coreSetup as any,
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
    const mockUiSettings = createMockUiSettingsClient(uiSettingsEnabled);
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: mockUiSettings },
        elasticsearch: { client: { asInternalUser: {}, asCurrentUser: {} } },
      }),
    };
    await handler(ctx, request, response);
    return response;
  };

  it('returns 404 when feature flag is disabled', async () => {
    const response = await callHandler({ params: { id: 'chunk-1' }, body: validBody }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.upsertDocument).not.toHaveBeenCalled();
  });

  it('returns 200 with the new document when created', async () => {
    mockSmlService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: true });
    const response = await callHandler({ params: { id: 'chunk-1' }, body: validBody });
    expect(mockSmlService.upsertDocument).toHaveBeenCalledWith({
      id: 'chunk-1',
      spaceId: 'test-space',
      document: validBody,
      esClient: expect.any(Object),
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        item: sampleDocument,
        created: true,
      },
    });
  });

  it('returns 200 with created=false when the document already existed', async () => {
    mockSmlService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: false });
    const response = await callHandler({ params: { id: 'chunk-1' }, body: validBody });
    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    expect(body.created).toBe(false);
    expect(body.item).toEqual(sampleDocument);
  });

  it('returns 404 when the document exists in another space', async () => {
    mockSmlService.upsertDocument.mockResolvedValue(null);
    const response = await callHandler({ params: { id: 'chunk-1' }, body: validBody });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML document 'chunk-1' not found" },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([{}, {}, {}]);

    const localRouter = httpServiceMock.createRouter();
    registerUpsertRoute({
      router: localRouter as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.put.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({
      params: { id: 'chunk-1' },
      body: validBody,
    });
    const response = httpServerMock.createResponseFactory();
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: createMockUiSettingsClient(true) },
        elasticsearch: { client: {} },
      }),
    };

    mockSmlService.upsertDocument.mockResolvedValue({ document: sampleDocument, created: true });
    await localHandler(ctx, request, response);
    expect(mockSmlService.upsertDocument).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.upsertDocument', async () => {
    mockSmlService.upsertDocument.mockRejectedValue(new Error('write failed'));
    await expect(callHandler({ params: { id: 'chunk-1' }, body: validBody })).rejects.toThrow(
      'write failed'
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('write failed'));
  });
});
