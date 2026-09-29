/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { productDocInstallStatusSavedObjectTypeName } from '../common/consts';
import { LockManagerService } from '@kbn/lock-manager';
import { ProductDocBasePlugin } from './plugin';
import type { ProductDocBaseSetupDependencies, ProductDocBaseStartDependencies } from './types';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from './services/install_lock';

vi.mock('@kbn/lock-manager');
vi.mock('./services/package_installer');
vi.mock('./services/search');
vi.mock('./services/doc_install_status');
vi.mock('./services/doc_manager');
vi.mock('./routes');
vi.mock('./tasks');
import { registerRoutes } from './routes';
import { PackageInstaller } from './services/package_installer';
import { registerTaskDefinitions, scheduleEnsureUpToDateTask } from './tasks';
import { DocumentationManager } from './services/doc_manager';

const PackageInstallMock = PackageInstaller as Mock;
const DocumentationManagerMock = DocumentationManager as Mock;
const LockManagerServiceMock = LockManagerService as Mock;

const callOrderOf = (fn: Mock): number => fn.mock.invocationCallOrder[0];

const mockEisAvailable = (coreStart: ReturnType<typeof coreMock.createStart>) => {
  coreStart.elasticsearch.client.asInternalUser.inference.get = vi.fn().mockResolvedValue({
    endpoints: [
      {
        inference_id: defaultInferenceEndpoints.JINAv5,
        task_type: 'text_embedding',
        service: 'elastic',
        service_settings: {},
      },
    ],
  });
};

const mockEisUnavailable = (coreStart: ReturnType<typeof coreMock.createStart>) => {
  coreStart.elasticsearch.client.asInternalUser.inference.get = vi.fn().mockResolvedValue({
    endpoints: [
      {
        inference_id: defaultInferenceEndpoints.ELSER,
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {},
      },
    ],
  });
};

describe('ProductDocBasePlugin', () => {
  let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let plugin: ProductDocBasePlugin;
  let pluginSetupDeps: ProductDocBaseSetupDependencies;
  let pluginStartDeps: ProductDocBaseStartDependencies;

  beforeEach(() => {
    initContext = coreMock.createPluginInitializerContext();
    plugin = new ProductDocBasePlugin(initContext);
    pluginSetupDeps = {
      taskManager: taskManagerMock.createSetup(),
    };
    pluginStartDeps = {
      licensing: licensingMock.createStart(),
      taskManager: taskManagerMock.createStart(),
    };

    PackageInstallMock.mockReturnValue({
      purgeArtifactsFolder: vi.fn().mockResolvedValue(undefined),
    });
    LockManagerServiceMock.mockReset();
    LockManagerServiceMock.mockImplementation(() => ({
      withLock: vi.fn((_lockId: string, callback: () => Promise<unknown>) => callback()),
    }));

    DocumentationManagerMock.mockReturnValue({
      install: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      uninstall: vi.fn().mockResolvedValue({}),
      getStatus: vi.fn().mockResolvedValue({}),
      getStatuses: vi.fn().mockResolvedValue({}),
      updateAll: vi.fn().mockResolvedValue({}),
      ensureDefaultProductDocumentation: vi.fn().mockResolvedValue(undefined),
      ensureDefaultSecurityLabs: vi.fn().mockResolvedValue(undefined),
      installSecurityLabs: vi.fn().mockResolvedValue({}),
      uninstallSecurityLabs: vi.fn().mockResolvedValue({}),
      getSecurityLabsStatus: vi.fn().mockResolvedValue({}),
      updateSecurityLabsAll: vi.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    (scheduleEnsureUpToDateTask as Mock).mockReset();
  });

  describe('#setup', () => {
    it('register the routes', () => {
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);

      expect(registerRoutes).toHaveBeenCalledTimes(1);
    });
    it('register the product-doc SO type', () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup, pluginSetupDeps);

      expect(coreSetup.savedObjects.registerType).toHaveBeenCalledTimes(1);
      expect(coreSetup.savedObjects.registerType).toHaveBeenCalledWith(
        expect.objectContaining({
          name: productDocInstallStatusSavedObjectTypeName,
        })
      );
    });
    it('register the task definitions', () => {
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);

      expect(registerTaskDefinitions).toHaveBeenCalledTimes(3);
    });
  });

  describe('#start', () => {
    it('returns a contract with the expected shape', () => {
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);
      const startContract = plugin.start(coreMock.createStart(), pluginStartDeps);
      expect(startContract).toEqual({
        management: {
          getStatus: expect.any(Function),
          getStatuses: expect.any(Function),
          install: expect.any(Function),
          uninstall: expect.any(Function),
          update: expect.any(Function),
          updateAll: expect.any(Function),
          updateSecurityLabsAll: expect.any(Function),
          installSecurityLabs: expect.any(Function),
          uninstallSecurityLabs: expect.any(Function),
          getSecurityLabsStatus: expect.any(Function),
        },
        search: expect.any(Function),
      });
    });

    it('schedules ensureDefaultProductDocumentation and updateAll on startup when AI and EIS are enabled', async () => {
      const coreStart = coreMock.createStart();
      mockEisAvailable(coreStart);
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);
      plugin.start(coreStart, pluginStartDeps);
      // Flush async startup tasks (uiSettings.get() → manager calls)
      await new Promise((resolve) => setImmediate(resolve));
      expect(DocumentationManagerMock().ensureDefaultProductDocumentation).toHaveBeenCalledTimes(1);
      expect(DocumentationManagerMock().updateAll).toHaveBeenCalledTimes(1);
    });

    it('purges leftover artifacts under the install lock before the startup tasks', async () => {
      const coreStart = coreMock.createStart();
      mockEisAvailable(coreStart);
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);
      plugin.start(coreStart, pluginStartDeps);
      await new Promise((resolve) => setImmediate(resolve));

      const lockManager = LockManagerServiceMock.mock.results[0].value as {
        withLock: Mock;
      };
      expect(lockManager.withLock).toHaveBeenCalledWith(
        PRODUCT_DOC_INSTALL_LOCK_ID,
        expect.any(Function),
        expect.objectContaining({ metadata: { source: 'purgeArtifactsFolder' } })
      );
      expect(PackageInstallMock().purgeArtifactsFolder).toHaveBeenCalledTimes(1);
      expect(callOrderOf(PackageInstallMock().purgeArtifactsFolder)).toBeLessThan(
        callOrderOf(DocumentationManagerMock().ensureDefaultProductDocumentation)
      );
    });

    it('skips startup tasks when EIS is not available', async () => {
      const coreStart = coreMock.createStart();
      mockEisUnavailable(coreStart);
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);
      plugin.start(coreStart, pluginStartDeps);
      await new Promise((resolve) => setImmediate(resolve));

      expect(DocumentationManagerMock().ensureDefaultProductDocumentation).not.toHaveBeenCalled();
      expect(DocumentationManagerMock().updateAll).not.toHaveBeenCalled();
      expect(DocumentationManagerMock().ensureDefaultSecurityLabs).not.toHaveBeenCalled();
      expect(DocumentationManagerMock().updateSecurityLabsAll).not.toHaveBeenCalled();
    });

    it.each(['NO_DEFAULT_MODEL', 'NO_DEFAULT_CONNECTOR'])(
      'skips startup tasks when AI features are disabled (%s)',
      async (disabledSentinel) => {
        const coreStart = coreMock.createStart();
        mockEisAvailable(coreStart);
        const disabledAiClient = {
          get: vi.fn().mockImplementation((key: string) => {
            if (key === 'genAiSettings:defaultAIConnector')
              return Promise.resolve(disabledSentinel);
            if (key === 'genAiSettings:defaultAIConnectorOnly') return Promise.resolve(true);
            return Promise.resolve(undefined);
          }),
        };
        (coreStart.uiSettings.asScopedToClient as Mock).mockReturnValue(disabledAiClient);

        plugin.setup(coreMock.createSetup(), pluginSetupDeps);
        plugin.start(coreStart, pluginStartDeps);
        await new Promise((resolve) => setImmediate(resolve));

        expect(DocumentationManagerMock().ensureDefaultProductDocumentation).not.toHaveBeenCalled();
        expect(DocumentationManagerMock().updateAll).not.toHaveBeenCalled();
        expect(DocumentationManagerMock().ensureDefaultSecurityLabs).not.toHaveBeenCalled();
        expect(DocumentationManagerMock().updateSecurityLabsAll).not.toHaveBeenCalled();
      }
    );

    it('skips Security Labs startup tasks in non-serverless deployments', async () => {
      const coreStart = coreMock.createStart();
      mockEisAvailable(coreStart);
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);
      // Default initContext is non-serverless (buildFlavor: 'traditional')
      plugin.start(coreStart, pluginStartDeps);
      await new Promise((resolve) => setImmediate(resolve));
      expect(DocumentationManagerMock().ensureDefaultSecurityLabs).not.toHaveBeenCalled();
      expect(DocumentationManagerMock().updateSecurityLabsAll).not.toHaveBeenCalled();
    });

    describe('serverless project gating', () => {
      let serverlessPlugin: ProductDocBasePlugin;
      let serverlessContext: ReturnType<typeof coreMock.createPluginInitializerContext>;

      beforeEach(() => {
        serverlessContext = coreMock.createPluginInitializerContext();
        (serverlessContext.env.packageInfo as Record<string, unknown>).buildFlavor = 'serverless';
        serverlessPlugin = new ProductDocBasePlugin(serverlessContext);
      });

      it('calls ensureDefaultSecurityLabs and updateSecurityLabsAll in serverless security projects', async () => {
        const coreStart = coreMock.createStart();
        mockEisAvailable(coreStart);
        serverlessPlugin.setup(coreMock.createSetup(), {
          ...pluginSetupDeps,
          cloud: {
            serverless: { projectType: 'security' },
          } as unknown as ProductDocBaseSetupDependencies['cloud'],
        });
        serverlessPlugin.start(coreStart, pluginStartDeps);
        await new Promise((resolve) => setImmediate(resolve));
        expect(DocumentationManagerMock().ensureDefaultSecurityLabs).toHaveBeenCalledTimes(1);
        expect(DocumentationManagerMock().updateSecurityLabsAll).toHaveBeenCalledTimes(1);
      });

      it('skips Security Labs startup tasks in serverless non-security projects', async () => {
        const coreStart = coreMock.createStart();
        mockEisAvailable(coreStart);
        serverlessPlugin.setup(coreMock.createSetup(), {
          ...pluginSetupDeps,
          cloud: {
            serverless: { projectType: 'observability' },
          } as unknown as ProductDocBaseSetupDependencies['cloud'],
        });
        serverlessPlugin.start(coreStart, pluginStartDeps);
        await new Promise((resolve) => setImmediate(resolve));
        expect(DocumentationManagerMock().ensureDefaultSecurityLabs).not.toHaveBeenCalled();
        expect(DocumentationManagerMock().updateSecurityLabsAll).not.toHaveBeenCalled();
      });
    });
  });
});
