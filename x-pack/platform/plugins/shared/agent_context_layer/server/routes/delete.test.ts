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
import { registerDeleteRoute } from './delete';

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

describe('registerDeleteRoute', () => {
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

    registerDeleteRoute({
      router: router as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.delete.mock.calls[0];
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
    expect(mockSmlService.deleteDocument).not.toHaveBeenCalled();
  });

  it('returns 404 when no matching document exists', async () => {
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
    mockSmlService.deleteDocument.mockResolvedValue(true);
    const response = await callHandler({ id: 'chunk-1' });
    expect(response.ok).toHaveBeenCalledWith({
      body: { id: 'chunk-1', deleted: true },
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([{}, {}, {}]);

    const localRouter = httpServiceMock.createRouter();
    registerDeleteRoute({
      router: localRouter as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.delete.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ params: { id: 'chunk-1' } });
    const response = httpServerMock.createResponseFactory();
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: createMockUiSettingsClient(true) },
        elasticsearch: { client: {} },
      }),
    };

    mockSmlService.deleteDocument.mockResolvedValue(true);
    await localHandler(ctx, request, response);
    expect(mockSmlService.deleteDocument).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.deleteDocument', async () => {
    mockSmlService.deleteDocument.mockRejectedValue(new Error('boom'));
    await expect(callHandler({ id: 'chunk-1' })).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
