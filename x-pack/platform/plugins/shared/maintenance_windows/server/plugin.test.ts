/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowsPlugin } from './plugin';
import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

describe('Maintenance Windows Plugin', () => {
  describe('setup()', () => {
    const setupMocks = coreMock.createSetup();
    const mockPlugins = {
      licensing: licensingMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      features: featuresPluginMock.createSetup(),
    };

    let plugin: MaintenanceWindowsPlugin;

    beforeEach(() => {
      jest.clearAllMocks();
      const context = coreMock.createPluginInitializerContext();
      plugin = new MaintenanceWindowsPlugin(context);
    });

    it('should register saved objects', () => {
      plugin.setup(setupMocks, mockPlugins);

      expect(setupMocks.savedObjects.registerType).toHaveBeenCalled();
    });

    it('should register feature', () => {
      plugin.setup(setupMocks, mockPlugins);

      expect(mockPlugins.features.registerKibanaFeature).toHaveBeenCalled();
    });

    it('should register routes', () => {
      plugin.setup(setupMocks, mockPlugins);

      expect(setupMocks.http.createRouter).toHaveBeenCalled();
    });

    it('should register route handler context', () => {
      plugin.setup(setupMocks, mockPlugins);

      expect(setupMocks.http.registerRouteHandlerContext).toHaveBeenCalledWith(
        'maintenanceWindow',
        expect.any(Function)
      );
    });
  });

  describe('start()', () => {
    test(`exposes getMaintenanceWindowClientWithAuth()`, async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new MaintenanceWindowsPlugin(context);

      plugin.setup(coreMock.createSetup(), {
        licensing: licensingMock.createSetup(),
        taskManager: taskManagerMock.createSetup(),
        features: featuresPluginMock.createSetup(),
      });

      const startContract = plugin.start(coreMock.createStart(), {
        taskManager: taskManagerMock.createStart(),
      });

      const fakeRequest = {
        headers: {},
        getBasePath: () => '',
        path: '/',
        route: { settings: {} },
        url: {
          href: '/',
        },
        raw: {
          req: {
            url: '/',
          },
        },
        getSavedObjectsClient: jest.fn(),
      } as unknown as KibanaRequest;

      const client = startContract.getMaintenanceWindowClientWithAuth(fakeRequest);
      expect(client).toBeDefined();
    });

    test(`exposes getMaintenanceWindowClientWithoutAuth()`, async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new MaintenanceWindowsPlugin(context);

      plugin.setup(coreMock.createSetup(), {
        licensing: licensingMock.createSetup(),
        taskManager: taskManagerMock.createSetup(),
        features: featuresPluginMock.createSetup(),
      });

      const startContract = plugin.start(coreMock.createStart(), {
        taskManager: taskManagerMock.createStart(),
      });

      const fakeRequest = {
        headers: {},
        getBasePath: () => '',
        path: '/',
        route: { settings: {} },
        url: {
          href: '/',
        },
        raw: {
          req: {
            url: '/',
          },
        },
        getSavedObjectsClient: jest.fn(),
      } as unknown as KibanaRequest;

      const client = startContract.getMaintenanceWindowClientWithoutAuth(fakeRequest);
      expect(client).toBeDefined();
    });

    test(`exposes getMaintenanceWindowClientInternal()`, async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new MaintenanceWindowsPlugin(context);

      plugin.setup(coreMock.createSetup(), {
        licensing: licensingMock.createSetup(),
        taskManager: taskManagerMock.createSetup(),
        features: featuresPluginMock.createSetup(),
      });

      const startContract = plugin.start(coreMock.createStart(), {
        taskManager: taskManagerMock.createStart(),
      });

      const fakeRequest = {
        headers: {},
        getBasePath: () => '',
        path: '/',
        route: { settings: {} },
        url: {
          href: '/',
        },
        raw: {
          req: {
            url: '/',
          },
        },
        getSavedObjectsClient: jest.fn(),
      } as unknown as KibanaRequest;

      const client = startContract.getMaintenanceWindowClientInternal(fakeRequest);
      expect(client).toBeDefined();
    });
  });
});
