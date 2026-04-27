/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, firstValueFrom } from 'rxjs';
import type { AppUpdater } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { IngestHubPlugin } from './plugin';
import type { IngestFlow } from './types';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  KibanaContextProvider: ({ children }: { children: unknown }) => children,
}));

jest.mock('lodash', () => ({
  once: (fn: unknown) => fn,
}));

const createPluginContext = (buildFlavor: 'traditional' | 'serverless' = 'traditional') =>
  coreMock.createPluginInitializerContext({}, { buildFlavor });

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

  describe('updater$', () => {
    let plugin: IngestHubPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let coreStart: ReturnType<typeof coreMock.createStart>;

    beforeEach(() => {
      plugin = new IngestHubPlugin(createPluginContext());
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    });

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

    it('hides app in a non-allowed space solution even when flag is enabled', async () => {
      enableFeatureFlag(coreStart);
      const spaces = spacesPluginMock.createStartContract();
      spaces.getActiveSpace.mockResolvedValue({
        id: 'default',
        name: 'Default',
        solution: 'security',
        disabledFeatures: [],
      });
      coreSetup.getStartServices.mockResolvedValue([coreStart, { spaces }, {}]);
      plugin.setup(coreSetup);

      const { updater$ } = coreSetup.application.register.mock.calls[0][0];
      const updater = await firstValueFrom(updater$!);
      expect((updater as AppUpdater)!({} as unknown as Parameters<AppUpdater>[0])).toEqual({
        visibleIn: [],
      });
    });
  });

  describe('mount', () => {
    let plugin: IngestHubPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let coreStart: ReturnType<typeof coreMock.createStart>;

    beforeEach(() => {
      plugin = new IngestHubPlugin(createPluginContext());
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    });

    it('redirects to discover when feature flag is disabled', async () => {
      disableFeatureFlag(coreStart);
      plugin.setup(coreSetup);

      const { mount } = coreSetup.application.register.mock.calls[0][0];
      const unmount = await mount(coreMock.createAppMountParameters());

      expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('discover');
      unmount();
    });

    it('redirects to discover in a non-allowed space solution even when flag is enabled', async () => {
      enableFeatureFlag(coreStart);
      const spaces = spacesPluginMock.createStartContract();
      spaces.getActiveSpace.mockResolvedValue({
        id: 'default',
        name: 'Default',
        solution: 'security',
        disabledFeatures: [],
      });
      coreSetup.getStartServices.mockResolvedValue([coreStart, { spaces }, {}]);
      plugin.setup(coreSetup);

      const { mount } = coreSetup.application.register.mock.calls[0][0];
      const unmount = await mount(coreMock.createAppMountParameters());

      expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('discover');
      unmount();
    });
  });

  describe('appEnabled$', () => {
    it('emits false when feature flag is disabled', async () => {
      const plugin = new IngestHubPlugin(createPluginContext());
      plugin.setup(coreMock.createSetup());

      const coreStart = coreMock.createStart();
      disableFeatureFlag(coreStart);

      const { appEnabled$ } = plugin.start(coreStart, {});
      await expect(firstValueFrom(appEnabled$)).resolves.toBe(false);
    });

    describe('serverless build flavor', () => {
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

        const { appEnabled$ } = plugin.start(coreStart, { cloud });
        await expect(firstValueFrom(appEnabled$)).resolves.toBe(true);
      });

      it('emits false for security project', async () => {
        const cloud = cloudMock.createStart();
        cloud.serverless = {
          projectId: 'test',
          projectType: 'security',
        } as CloudStart['serverless'];

        const { appEnabled$ } = plugin.start(coreStart, { cloud });
        await expect(firstValueFrom(appEnabled$)).resolves.toBe(false);
      });
    });

    describe('traditional build flavor', () => {
      let plugin: IngestHubPlugin;
      let coreStart: ReturnType<typeof coreMock.createStart>;

      beforeEach(() => {
        plugin = new IngestHubPlugin(createPluginContext());
        plugin.setup(coreMock.createSetup());
        coreStart = coreMock.createStart();
        enableFeatureFlag(coreStart);
      });

      it('emits true with classic space solution', async () => {
        const spaces = spacesPluginMock.createStartContract();
        spaces.getActiveSpace.mockResolvedValue({
          id: 'default',
          name: 'Default',
          solution: 'classic',
          disabledFeatures: [],
        });

        const { appEnabled$ } = plugin.start(coreStart, { spaces });
        await expect(firstValueFrom(appEnabled$)).resolves.toBe(true);
      });

      it('emits true with oblt space solution', async () => {
        const spaces = spacesPluginMock.createStartContract();
        spaces.getActiveSpace.mockResolvedValue({
          id: 'default',
          name: 'Default',
          solution: 'oblt',
          disabledFeatures: [],
        });

        const { appEnabled$ } = plugin.start(coreStart, { spaces });
        await expect(firstValueFrom(appEnabled$)).resolves.toBe(true);
      });

      it('emits false with security space solution', async () => {
        const spaces = spacesPluginMock.createStartContract();
        spaces.getActiveSpace.mockResolvedValue({
          id: 'default',
          name: 'Default',
          solution: 'security',
          disabledFeatures: [],
        });

        const { appEnabled$ } = plugin.start(coreStart, { spaces });
        await expect(firstValueFrom(appEnabled$)).resolves.toBe(false);
      });
    });
  });

  describe('registerIngestFlows', () => {
    const flow = (id: string): IngestFlow => ({
      id,
      title: id,
      description: id,
      icon: 'logoElastic',
      category: 'Hosts',
      navigateTo: { appId: 'observabilityOnboarding', path: `/${id}` },
    });

    let start: ReturnType<IngestHubPlugin['start']>;
    let logger: MockedLogger;

    beforeEach(() => {
      const context = coreMock.createPluginInitializerContext({});
      const plugin = new IngestHubPlugin(context);
      plugin.setup(coreMock.createSetup());
      start = plugin.start(coreMock.createStart(), {});
      logger = context.logger as MockedLogger;
    });

    it('warns when a duplicate id is registered', () => {
      start.registerIngestFlows([flow('a'), flow('a'), flow('b'), flow('c')]);

      expect(loggerMock.collect(logger).warn).toEqual([
        ['Duplicate flow id "a" — skipping registration.'],
      ]);
    });

    it('warns when a duplicate id is registered later', () => {
      start.registerIngestFlows([flow('a'), flow('b')]);
      start.registerIngestFlows([flow('a'), flow('c')]);

      expect(loggerMock.collect(logger).warn).toEqual([
        ['Duplicate flow id "a" — skipping registration.'],
      ]);
    });

    it('does not warn when all ids are unique', () => {
      start.registerIngestFlows([flow('a'), flow('b'), flow('c')]);

      expect(loggerMock.collect(logger).warn).toEqual([]);
    });
  });
});
