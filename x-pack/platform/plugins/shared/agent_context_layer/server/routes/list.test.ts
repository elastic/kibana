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
import { registerListRoute } from './list';

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

describe('registerListRoute', () => {
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

    registerListRoute({
      router: router as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.get.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (query: Record<string, unknown>, uiSettingsEnabled = true) => {
    const request = httpServerMock.createKibanaRequest({ query });
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
    const response = await callHandler({ page: 1, per_page: 20 }, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.listDocuments).not.toHaveBeenCalled();
  });

  it('returns 200 with paginated results, items, and metadata', async () => {
    mockSmlService.listDocuments.mockResolvedValue({ total: 1, results: [sampleDocument] });
    const response = await callHandler({ page: 1, per_page: 20 });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        total: 1,
        page: 1,
        per_page: 20,
        items: [sampleDocument],
      },
    });
  });

  it('passes filters and pagination to sml.listDocuments', async () => {
    mockSmlService.listDocuments.mockResolvedValue({ total: 0, results: [] });
    await callHandler({
      page: 2,
      per_page: 5,
      type: 'dashboard',
      origin_id: 'dash-1',
    });
    expect(mockSmlService.listDocuments).toHaveBeenCalledWith({
      spaceId: 'test-space',
      esClient: expect.any(Object),
      page: 2,
      perPage: 5,
      type: 'dashboard',
      originId: 'dash-1',
    });
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([{}, {}, {}]);

    const localRouter = httpServiceMock.createRouter();
    registerListRoute({
      router: localRouter as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.get.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ query: { page: 1, per_page: 20 } });
    const response = httpServerMock.createResponseFactory();
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: createMockUiSettingsClient(true) },
        elasticsearch: { client: {} },
      }),
    };

    mockSmlService.listDocuments.mockResolvedValue({ total: 0, results: [] });
    await localHandler(ctx, request, response);
    expect(mockSmlService.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.listDocuments', async () => {
    mockSmlService.listDocuments.mockRejectedValue(new Error('boom'));
    await expect(callHandler({ page: 1, per_page: 20 })).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
