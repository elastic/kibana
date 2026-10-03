/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { coreMock } from '@kbn/core/server/mocks';
import { SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';

import type { FleetConfigType } from '../common/types';

import { FleetPlugin, type FleetStartDeps } from './plugin';
import { setupFleet } from './services/setup';
import { appContextService } from './services';
import { createAppContextStartContractMock } from './mocks';

jest.mock('./services/setup', () => {
  return {
    ...jest.requireActual('./services/setup'),
    setupFleet: jest.fn(),
  };
});

const mockedSetupFleet = setupFleet as jest.MockedFunction<typeof setupFleet>;

interface PluginPrivates {
  fleetStatus$: { getValue: () => { summary: string } };
  setupCompletedPromise: Promise<void>;
  startContextBound: boolean;
  initializeUninstallTokens: () => Promise<void>;
}

function createPlugin() {
  const initializerContext = coreMock.createPluginInitializerContext<FleetConfigType>(
    {} as FleetConfigType
  );
  const plugin = new FleetPlugin(initializerContext);
  const privates = plugin as unknown as PluginPrivates;
  const core = coreMock.createStart();
  // `bindStartContext` constructs signing/uninstall services and starts app-context; skip it so
  // these tests can exercise `lazyInitialize` without mocking every `FleetStartDeps` service.
  privates.startContextBound = true;
  jest.spyOn(privates, 'initializeUninstallTokens').mockResolvedValue(undefined);
  return { plugin, privates, core };
}

const mockLicensing = (available: boolean): LicensingPluginStart =>
  ({
    license$: of({
      getFeature: () => ({ isEnabled: available, isAvailable: available }),
    }),
  } as unknown as LicensingPluginStart);

const startDeps = (licensing: LicensingPluginStart): FleetStartDeps =>
  ({ licensing } as FleetStartDeps);

describe('FleetPlugin#lazyInitialize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('runs setupFleet with the instance lock after waiting on the injected licensing contract', async () => {
    const { plugin, core } = createPlugin();
    mockedSetupFleet.mockResolvedValue({ isInitialized: true, nonFatalErrors: [] });

    await plugin.lazyInitialize(core, startDeps(mockLicensing(true)));

    expect(core.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith({
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
    expect(mockedSetupFleet).toHaveBeenCalledWith(
      core.savedObjects.getUnsafeInternalClient({
        excludedExtensions: [SPACES_EXTENSION_ID],
      }),
      core.elasticsearch.client.asInternalUser,
      { useLock: true }
    );
  });

  it('resolves fleetSetupCompleted() once setup succeeds', async () => {
    const { plugin, privates, core } = createPlugin();
    mockedSetupFleet.mockResolvedValue({ isInitialized: true, nonFatalErrors: [] });

    await plugin.lazyInitialize(core, startDeps(mockLicensing(true)));

    await expect(privates.setupCompletedPromise).resolves.toBeUndefined();
  });

  it('propagates a fatal setupFleet failure, but still resolves fleetSetupCompleted()', async () => {
    const { plugin, privates, core } = createPlugin();
    const failure = new Error('SO method mocked to throw');
    mockedSetupFleet.mockRejectedValue(failure);

    await expect(plugin.lazyInitialize(core, startDeps(mockLicensing(true)))).rejects.toBe(failure);

    expect(privates.fleetStatus$.getValue().summary).toBe('Fleet setup failed');
    await expect(privates.setupCompletedPromise).resolves.toBeUndefined();
  });
});
