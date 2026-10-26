/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { updateAssetsRoute } from './update_assets_route';

const ASSET_ID = 'asset-1';
const ASSET_NAME = 'hardware-monitoring';

const makePackAsset = (version = 1) => ({
  id: ASSET_ID,
  type: packAssetSavedObjectType,
  attributes: {
    name: ASSET_NAME,
    description: 'Monitor hardware',
    queries: [{ id: 'q1', query: 'select 1;', interval: 3600 }],
    version,
  },
  references: [],
});

const makeInstalledPack = (version = 1, overrides: Record<string, unknown> = {}) => ({
  id: 'pack-1',
  type: packSavedObjectType,
  attributes: {
    name: ASSET_NAME,
    description: 'Monitor hardware',
    queries: [],
    version,
    created_by: '1234567890',
    updated_by: '1234567890',
    ...overrides,
  },
  references: [],
});

describe('updateAssetsRoute', () => {
  let routeHandler: RequestHandler;
  let mockSavedObjectsClient: {
    find: jest.Mock;
    get: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  const mockInstallation = {
    installed_kibana: [{ type: packAssetSavedObjectType, id: ASSET_ID }],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSavedObjectsClient = {
      find: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      service: {
        getPackageService: jest.fn().mockReturnValue({
          asInternalUser: {
            getInstallation: jest.fn().mockResolvedValue(mockInstallation),
          },
        }),
      },
    } as unknown as OsqueryAppContext;

    const mockRouter = httpServiceMock.createSetupContract().createRouter();
    updateAssetsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('post', '/internal/osquery/assets/update');
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.internal.v1}] not found!`);
    }

    routeHandler = routeVersion.handler as RequestHandler;
  });

  const callHandler = async () => {
    const mockContext = {
      core: Promise.resolve({
        savedObjects: { client: mockSavedObjectsClient },
        // getCurrentUser returns a numeric ID (simulating ECH) — the route should ignore it
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ username: '1234567890' }),
          },
        },
      }),
    };
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler(mockContext as never, mockRequest, mockResponse);

    return { mockResponse };
  };

  describe('install path', () => {
    beforeEach(() => {
      // Pack asset not yet installed
      mockSavedObjectsClient.find
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }) // isInstalled check
        .mockResolvedValueOnce({ saved_objects: [] }); // conflictingEntries check

      mockSavedObjectsClient.get.mockResolvedValue(makePackAsset());
      mockSavedObjectsClient.create.mockResolvedValue({});
    });

    it('sets created_by and updated_by to "elastic"', async () => {
      await callHandler();

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        packSavedObjectType,
        expect.objectContaining({
          created_by: 'elastic',
          updated_by: 'elastic',
        }),
        expect.any(Object)
      );
    });

    it('does not use the authenticated user for attribution', async () => {
      await callHandler();

      const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
      expect(createArgs.created_by).not.toMatch(/^\d+$/);
      expect(createArgs.updated_by).not.toMatch(/^\d+$/);
    });
  });

  describe('update path (self-healing)', () => {
    beforeEach(() => {
      const installedPack = makeInstalledPack(1);
      // Pack is already installed with version 1
      mockSavedObjectsClient.find
        .mockResolvedValueOnce({ saved_objects: [installedPack], total: 1 }) // isInstalled check
        .mockResolvedValueOnce({ saved_objects: [installedPack], total: 1 }); // packSavedObjectsResponse

      // Asset has version 2 (newer)
      mockSavedObjectsClient.get
        .mockResolvedValueOnce(makePackAsset(2)) // version comparison
        .mockResolvedValueOnce(makePackAsset(2)); // update path get

      mockSavedObjectsClient.update.mockResolvedValue({});
    });

    it('sets created_by and updated_by to "elastic" in merge overrides', async () => {
      await callHandler();

      expect(mockSavedObjectsClient.update).toHaveBeenCalledTimes(1);

      const updateArgs = mockSavedObjectsClient.update.mock.calls[0][2];
      expect(updateArgs).toEqual(
        expect.objectContaining({
          created_by: 'elastic',
          updated_by: 'elastic',
        })
      );
    });

    it('overwrites existing numeric created_by from prior install', async () => {
      await callHandler();

      const updateArgs = mockSavedObjectsClient.update.mock.calls[0][2];
      expect(updateArgs.created_by).toBe('elastic');
      expect(updateArgs.created_by).not.toBe('1234567890');
    });
  });
});
