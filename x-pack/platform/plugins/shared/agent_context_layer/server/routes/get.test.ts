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
import { registerGetRoute } from './get';

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
  permissions: ['saved_object:lens/get'],
};

describe('registerGetRoute', () => {
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

    registerGetRoute({
      router: router as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.get.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (params: Record<string, unknown>, uiSettingsEnabled = true) => {
    const request = httpServerMock.createKibanaRequest({ params });
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
    const response = await callHandler({ id: 'chunk-1' }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.getDocument).not.toHaveBeenCalled();
  });

  it('returns 404 when the document is not found', async () => {
    mockSmlService.getDocument.mockResolvedValue(undefined);
    const response = await callHandler({ id: 'missing' });
    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: "SML document 'missing' not found" },
    });
  });

  it('returns 200 with the document when found', async () => {
    mockSmlService.getDocument.mockResolvedValue(sampleDocument);
    const response = await callHandler({ id: 'chunk-1' });
    expect(mockSmlService.getDocument).toHaveBeenCalledWith({
      id: 'chunk-1',
      spaceId: 'test-space',
      esClient: expect.any(Object),
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { item: sampleDocument },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([{}, {}, {}]);

    const localRouter = httpServiceMock.createRouter();
    registerGetRoute({
      router: localRouter as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.get.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ params: { id: 'chunk-1' } });
    const response = httpServerMock.createResponseFactory();
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: createMockUiSettingsClient(true) },
        elasticsearch: { client: {} },
      }),
    };

    mockSmlService.getDocument.mockResolvedValue(sampleDocument);
    await localHandler(ctx, request, response);
    expect(mockSmlService.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.getDocument', async () => {
    mockSmlService.getDocument.mockRejectedValue(new Error('ES connection failed'));
    await expect(callHandler({ id: 'chunk-1' })).rejects.toThrow('ES connection failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES connection failed'));
  });
});
