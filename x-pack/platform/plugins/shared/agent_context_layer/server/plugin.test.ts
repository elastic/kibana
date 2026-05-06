/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SmlDocument } from './services/sml/types';
import type { AgentContextLayerStartDependencies } from './types';

const mockSmlServiceInstance = {
  setup: jest.fn(),
  start: jest.fn(),
};

jest.mock('./services/sml/sml_service', () => ({
  createSmlService: jest.fn(() => mockSmlServiceInstance),
  isNotFoundError: jest.fn().mockReturnValue(false),
}));

jest.mock('./services/sml/sml_task_definitions', () => ({
  registerSmlCrawlerTaskDefinition: jest.fn(),
  scheduleSmlCrawlerTasks: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./services/sml/execute_sml_attach_items', () => ({
  resolveSmlAttachItems: jest.fn(),
}));

jest.mock('./features', () => ({
  registerFeatures: jest.fn(),
}));

jest.mock('./ui_settings', () => ({
  registerUISettings: jest.fn(),
}));

jest.mock('./routes/search', () => ({
  registerSearchRoute: jest.fn(),
}));

import { AgentContextLayerPlugin } from './plugin';

describe('AgentContextLayerPlugin', () => {
  describe('public start contract: getDocuments', () => {
    const createDoc = (id: string): SmlDocument => ({
      id,
      type: 'dashboard',
      title: `${id}-title`,
      origin_id: `origin-${id}`,
      content: 'content',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      spaces: ['default'],
      permissions: ['saved_object:dashboard/get'],
    });

    const setupPlugin = ({
      checkItemsAccess,
      getDocumentsImpl,
      spaceFromRequest,
    }: {
      checkItemsAccess: jest.Mock;
      getDocumentsImpl: jest.Mock;
      spaceFromRequest?: string;
    }) => {
      mockSmlServiceInstance.setup.mockReturnValue({ registerType: jest.fn() });
      mockSmlServiceInstance.start.mockReturnValue({
        search: jest.fn(),
        checkItemsAccess,
        getDocuments: getDocumentsImpl,
        getTypeDefinition: jest.fn(),
        indexAttachment: jest.fn(),
        getCrawler: jest.fn(),
        listTypeDefinitions: jest.fn().mockReturnValue([]),
      });

      const plugin = new AgentContextLayerPlugin(coreMock.createPluginInitializerContext());

      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup as any, {
        features: { registerKibanaFeature: jest.fn() } as any,
        taskManager: { registerTaskDefinitions: jest.fn() } as any,
      });

      const scopedEsClient = {
        asCurrentUser: {},
        asInternalUser: {},
      } as unknown as IScopedClusterClient;
      const coreStart = coreMock.createStart();
      (coreStart.elasticsearch.client.asScoped as jest.Mock).mockReturnValue(scopedEsClient);

      const startDeps: AgentContextLayerStartDependencies = {
        taskManager: { schedule: jest.fn() } as any,
        spaces: spaceFromRequest
          ? ({
              spacesService: { getSpaceId: jest.fn().mockReturnValue(spaceFromRequest) },
            } as any)
          : undefined,
        security: { authz: {} as any } as any,
      };

      const start = plugin.start(coreStart, startDeps);
      return { start, scopedEsClient, coreStart };
    };

    beforeEach(() => {
      mockSmlServiceInstance.setup.mockReset();
      mockSmlServiceInstance.start.mockReset();
    });

    it('returns an empty map when no IDs are requested without calling the service', async () => {
      const checkItemsAccess = jest.fn();
      const getDocumentsImpl = jest.fn();
      const { start } = setupPlugin({ checkItemsAccess, getDocumentsImpl });

      const result = await start.getDocuments({
        ids: [],
        request: httpServerMock.createKibanaRequest(),
      });

      expect(result).toEqual(new Map());
      expect(checkItemsAccess).not.toHaveBeenCalled();
      expect(getDocumentsImpl).not.toHaveBeenCalled();
    });

    it('checks access first and only fetches documents for authorized IDs', async () => {
      const checkItemsAccess = jest.fn().mockResolvedValue(
        new Map<string, boolean>([
          ['a', true],
          ['b', false],
          ['c', true],
        ])
      );
      const getDocumentsImpl = jest.fn().mockResolvedValue(
        new Map<string, SmlDocument>([
          ['a', createDoc('a')],
          ['c', createDoc('c')],
        ])
      );
      const { start, scopedEsClient } = setupPlugin({
        checkItemsAccess,
        getDocumentsImpl,
        spaceFromRequest: 'space-1',
      });

      const request = httpServerMock.createKibanaRequest();
      const result = await start.getDocuments({ ids: ['a', 'b', 'c'], request });

      expect(checkItemsAccess).toHaveBeenCalledWith({
        ids: ['a', 'b', 'c'],
        spaceId: 'space-1',
        esClient: scopedEsClient,
        request,
      });
      expect(getDocumentsImpl).toHaveBeenCalledWith({
        ids: ['a', 'c'],
        spaceId: 'space-1',
        esClient: scopedEsClient,
      });
      expect([...result.keys()]).toEqual(['a', 'c']);
    });

    it('returns an empty map and skips the document fetch when nothing is authorized', async () => {
      const checkItemsAccess = jest.fn().mockResolvedValue(
        new Map<string, boolean>([
          ['a', false],
          ['b', false],
        ])
      );
      const getDocumentsImpl = jest.fn();
      const { start } = setupPlugin({
        checkItemsAccess,
        getDocumentsImpl,
        spaceFromRequest: 'default',
      });

      const result = await start.getDocuments({
        ids: ['a', 'b'],
        request: httpServerMock.createKibanaRequest(),
      });

      expect(result).toEqual(new Map());
      expect(checkItemsAccess).toHaveBeenCalledTimes(1);
      expect(getDocumentsImpl).not.toHaveBeenCalled();
    });

    it('uses the provided spaceId verbatim, ignoring the spaces service', async () => {
      const checkItemsAccess = jest.fn().mockResolvedValue(new Map([['a', true]]));
      const getDocumentsImpl = jest.fn().mockResolvedValue(new Map([['a', createDoc('a')]]));
      const { start } = setupPlugin({
        checkItemsAccess,
        getDocumentsImpl,
        spaceFromRequest: 'auto-space',
      });

      await start.getDocuments({
        ids: ['a'],
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'explicit-space',
      });

      expect(checkItemsAccess).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'explicit-space' })
      );
      expect(getDocumentsImpl).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'explicit-space' })
      );
    });

    it('falls back to the default space when no spaces service and no spaceId are provided', async () => {
      const checkItemsAccess = jest.fn().mockResolvedValue(new Map([['a', true]]));
      const getDocumentsImpl = jest.fn().mockResolvedValue(new Map([['a', createDoc('a')]]));
      const { start } = setupPlugin({ checkItemsAccess, getDocumentsImpl });

      await start.getDocuments({
        ids: ['a'],
        request: httpServerMock.createKibanaRequest(),
      });

      expect(checkItemsAccess).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default' })
      );
    });

    it('does not expose checkItemsAccess on the public contract', async () => {
      const { start } = setupPlugin({
        checkItemsAccess: jest.fn(),
        getDocumentsImpl: jest.fn().mockResolvedValue(new Map()),
      });

      expect((start as unknown as Record<string, unknown>).checkItemsAccess).toBeUndefined();
    });
  });
});
