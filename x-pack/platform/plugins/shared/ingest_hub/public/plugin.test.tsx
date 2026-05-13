/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { AppUpdater, PluginInitializerContext } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { IngestHubPlugin } from './plugin';

const createPluginContext = (buildFlavor: 'traditional' | 'serverless' = 'traditional') =>
  ({
    env: {
      packageInfo: { buildFlavor },
    },
  } as unknown as PluginInitializerContext);

const enableFeatureFlag = (coreStart: ReturnType<typeof coreMock.createStart>) => {
  (coreStart.featureFlags.getBooleanValue$ as jest.Mock).mockReturnValue(of(true));
};

const disableFeatureFlag = (coreStart: ReturnType<typeof coreMock.createStart>) => {
  (coreStart.featureFlags.getBooleanValue$ as jest.Mock).mockReturnValue(of(false));
};

describe('IngestHubPlugin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('navigationAvailable$', () => {
    it('emits false when feature flag is disabled', async () => {
      const plugin = new IngestHubPlugin(createPluginContext());
      plugin.setup(coreMock.createSetup());

      const coreStart = coreMock.createStart();
      disableFeatureFlag(coreStart);

      const { navigationAvailable$ } = plugin.start(coreStart, {});
      await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(false);
    });

    describe('serverless', () => {
      let plugin: IngestHubPlugin;
      let coreStart: ReturnType<typeof coreMock.createStart>;

      beforeEach(() => {
        plugin = new IngestHubPlugin(createPluginContext('serverless'));
        plugin.setup(coreMock.createSetup());
        coreStart = coreMock.createStart();
        enableFeatureFlag(coreStart);
      });

      it('emits true for observability project', async () => {
        const cloud = cloudMock.createStart();
        cloud.serverless = {
          projectId: 'test',
          projectType: 'observability',
        } as CloudStart['serverless'];

        const { navigationAvailable$ } = plugin.start(coreStart, { cloud });
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(true);
      });

      it('emits false for security project', async () => {
        const cloud = cloudMock.createStart();
        cloud.serverless = {
          projectId: 'test',
          projectType: 'security',
        } as CloudStart['serverless'];

        const { navigationAvailable$ } = plugin.start(coreStart, { cloud });
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(false);
      });
    });

    describe('classic deployment', () => {
      let plugin: IngestHubPlugin;
      let coreStart: ReturnType<typeof coreMock.createStart>;

      beforeEach(() => {
        plugin = new IngestHubPlugin(createPluginContext());
        plugin.setup(coreMock.createSetup());
        coreStart = coreMock.createStart();
        enableFeatureFlag(coreStart);
      });

      it('emits true without spaces plugin', async () => {
        const { navigationAvailable$ } = plugin.start(coreStart, {});
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(true);
      });

      it('emits true with oblt space solution', async () => {
        const spaces = spacesPluginMock.createStartContract();
        spaces.getActiveSpace.mockResolvedValue({
          id: 'default',
          name: 'Default',
          solution: 'oblt',
          disabledFeatures: [],
        });

        const { navigationAvailable$ } = plugin.start(coreStart, { spaces });
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(true);
      });

      it('emits false with es space solution', async () => {
        const spaces = spacesPluginMock.createStartContract();
        spaces.getActiveSpace.mockResolvedValue({
          id: 'default',
          name: 'Default',
          solution: 'es',
          disabledFeatures: [],
        });

        const { navigationAvailable$ } = plugin.start(coreStart, { spaces });
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(false);
      });
    });
  });

  describe('setup', () => {
    let plugin: IngestHubPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let coreStart: ReturnType<typeof coreMock.createStart>;

    beforeEach(() => {
      plugin = new IngestHubPlugin(createPluginContext());
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    });

    describe('updater$', () => {
      it('sets app visible when feature flag is enabled', async () => {
        enableFeatureFlag(coreStart);
        plugin.setup(coreSetup);

        const { updater$ } = coreSetup.application.register.mock.calls[0][0];
        const updater = await firstValueFrom(updater$!);
        expect((updater as AppUpdater)!({} as unknown as Parameters<AppUpdater>[0])).toEqual({
          visibleIn: ['sideNav', 'globalSearch'],
        });
      });

      it('hides app when feature flag is disabled', async () => {
        disableFeatureFlag(coreStart);
        plugin.setup(coreSetup);

        const { updater$ } = coreSetup.application.register.mock.calls[0][0];
        const updater = await firstValueFrom(updater$!);
        expect((updater as AppUpdater)!({} as unknown as Parameters<AppUpdater>[0])).toEqual({
          visibleIn: [],
        });
      });
    });

    describe('mount', () => {
      it('redirects to discover when feature flag is disabled', async () => {
        (coreStart.featureFlags.getBooleanValue as jest.Mock).mockReturnValue(false);
        plugin.setup(coreSetup);

        const { mount } = coreSetup.application.register.mock.calls[0][0];
        const unmount = await mount(coreMock.createAppMountParameters());

        expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('discover');
        unmount();
      });
    });
  });
});
