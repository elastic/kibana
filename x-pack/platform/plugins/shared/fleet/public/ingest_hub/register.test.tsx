/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { AppUpdater, CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { FleetStart, FleetStartDeps } from '../plugin';
import { createIngestHubStart, registerIngestHubApps } from './register';
import type { IngestFlow } from './types';

const enableFeatureFlag = (coreStart: ReturnType<typeof coreMock.createStart>) => {
  (coreStart.featureFlags.getBooleanValue$ as jest.Mock).mockReturnValue(of(true));
};

const disableFeatureFlag = (coreStart: ReturnType<typeof coreMock.createStart>) => {
  (coreStart.featureFlags.getBooleanValue$ as jest.Mock).mockReturnValue(of(false));
};

const startIngestHub = (
  coreStart: CoreStart,
  deps: { spaces?: ReturnType<typeof spacesPluginMock.createStartContract>; cloud?: CloudStart },
  isServerless = false
) =>
  createIngestHubStart({
    core: coreStart,
    deps,
    isServerless,
    ingestFlows: [] as IngestFlow[],
  });

const setupIngestHub = (coreSetup: ReturnType<typeof coreMock.createSetup>) =>
  registerIngestHubApps({
    core: coreSetup as unknown as CoreSetup<FleetStartDeps, FleetStart>,
    kibanaVersion: '9.0.0',
    ingestFlows: [],
  });

describe('ingest hub registration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('navigationAvailable$', () => {
    it('emits false when feature flag is disabled', async () => {
      const coreStart = coreMock.createStart();
      disableFeatureFlag(coreStart);

      const { navigationAvailable$ } = startIngestHub(coreStart, {});
      await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(false);
    });

    describe('serverless', () => {
      let coreStart: ReturnType<typeof coreMock.createStart>;

      beforeEach(() => {
        coreStart = coreMock.createStart();
        enableFeatureFlag(coreStart);
      });

      it('emits true for observability project', async () => {
        const cloud = cloudMock.createStart();
        cloud.serverless = {
          projectId: 'test',
          projectType: 'observability',
        } as CloudStart['serverless'];

        const { navigationAvailable$ } = startIngestHub(coreStart, { cloud }, true);
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(true);
      });

      it('emits false for security project', async () => {
        const cloud = cloudMock.createStart();
        cloud.serverless = {
          projectId: 'test',
          projectType: 'security',
        } as CloudStart['serverless'];

        const { navigationAvailable$ } = startIngestHub(coreStart, { cloud }, true);
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(false);
      });
    });

    describe('classic deployment', () => {
      let coreStart: ReturnType<typeof coreMock.createStart>;

      beforeEach(() => {
        coreStart = coreMock.createStart();
        enableFeatureFlag(coreStart);
      });

      it('emits true without spaces plugin', async () => {
        const { navigationAvailable$ } = startIngestHub(coreStart, {});
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(true);
      });

      it('emits true with oblt space solution', async () => {
        const spaces = spacesPluginMock.createStartContract();
        spaces.getActiveSpace.mockResolvedValue({
          id: asSpaceId('default'),
          name: 'Default',
          solution: 'oblt',
          disabledFeatures: [],
        });

        const { navigationAvailable$ } = startIngestHub(coreStart, { spaces });
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(true);
      });

      it('emits false with es space solution', async () => {
        const spaces = spacesPluginMock.createStartContract();
        spaces.getActiveSpace.mockResolvedValue({
          id: asSpaceId('default'),
          name: 'Default',
          solution: 'es',
          disabledFeatures: [],
        });

        const { navigationAvailable$ } = startIngestHub(coreStart, { spaces });
        await expect(firstValueFrom(navigationAvailable$)).resolves.toBe(false);
      });
    });
  });

  describe('app registration', () => {
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let coreStart: ReturnType<typeof coreMock.createStart>;

    beforeEach(() => {
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    });

    describe('updater$', () => {
      it('sets app visible when feature flag is enabled', async () => {
        enableFeatureFlag(coreStart);
        setupIngestHub(coreSetup);

        const { updater$ } = coreSetup.application.register.mock.calls[0][0];
        const updater = await firstValueFrom(updater$!);
        expect((updater as AppUpdater)!({} as unknown as Parameters<AppUpdater>[0])).toEqual({
          visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
        });
      });

      it('hides app when feature flag is disabled', async () => {
        disableFeatureFlag(coreStart);
        setupIngestHub(coreSetup);

        const { updater$ } = coreSetup.application.register.mock.calls[0][0];
        const updater = await firstValueFrom(updater$!);
        expect((updater as AppUpdater)!({} as unknown as Parameters<AppUpdater>[0])).toEqual({
          visibleIn: [],
        });
      });
    });

    describe('mount', () => {
      it('redirects to discover when feature flag is disabled', async () => {
        disableFeatureFlag(coreStart);
        setupIngestHub(coreSetup);

        const { mount } = coreSetup.application.register.mock.calls[0][0];
        const unmount = await mount(coreMock.createAppMountParameters());

        expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('discover');
        unmount();
      });
    });
  });
});
