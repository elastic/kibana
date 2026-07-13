/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import {
  coreMock,
  elasticsearchServiceMock,
  savedObjectsRepositoryMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { CoreStart, LazyInitContext } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';

import type { FleetConfigType } from '../common/types';

import { FleetPlugin } from './plugin';
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
  core: CoreStart;
  fleetStatus$: { getValue: () => { summary: string } };
  setupCompletedPromise: Promise<void>;
  initializeUninstallTokens: () => Promise<void>;
}

// `lazyInitialize` only needs `this.core` (captured during `start()`) plus the plugin instance's
// own constructor-initialized fields (`fleetStatus$`, `setupCompletedPromise`). Fleet's real
// `start()` constructs ~15+ unrelated services/tasks, so rather than mocking all of those to call
// it for real, this test constructs the plugin normally and pokes the one field `start()` would
// have set - the "isolate the slice" approach flagged as acceptable in
// docs/specs/2026-07-13-fleet-lazy-init-licensing-contract.md's handoff addendum.
//
// `plugin` and `privates` are two separately-cast views of the same instance: intersecting
// `FleetPlugin` with a type that re-declares its private fields (`FleetPlugin & PluginPrivates`)
// collapses to `never` under `tsc`, so public methods are called through `plugin` and private
// fields are poked/read through `privates` instead.
function createPlugin() {
  const initializerContext = coreMock.createPluginInitializerContext<FleetConfigType>(
    {} as FleetConfigType
  );
  const plugin = new FleetPlugin(initializerContext);
  const privates = plugin as unknown as PluginPrivates;
  const core = coreMock.createStart();
  privates.core = core;
  jest.spyOn(privates, 'initializeUninstallTokens').mockResolvedValue(undefined);
  return { plugin, privates, core };
}

const createLazyInitContext = (): LazyInitContext => ({
  elasticsearch: { client: elasticsearchServiceMock.createElasticsearchClient() },
  savedObjects: savedObjectsRepositoryMock.create(),
  logger: loggingSystemMock.create().get(),
});

const mockLicensingContract = (available: boolean): LicensingPluginStart =>
  ({
    license$: of({
      getFeature: () => ({ isEnabled: available, isAvailable: available }),
    }),
  } as unknown as LicensingPluginStart);

describe('FleetPlugin#lazyInitialize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('loads the licensing contract via core.plugins.loadPluginContract, then runs setupFleet using core (not ctx) savedObjects', async () => {
    const { plugin, core } = createPlugin();
    jest.mocked(core.plugins.loadPluginContract).mockResolvedValue(mockLicensingContract(true));
    mockedSetupFleet.mockResolvedValue({ isInitialized: true, nonFatalErrors: [] });

    const ctx = createLazyInitContext();
    await plugin.lazyInitialize(ctx);

    expect(core.plugins.loadPluginContract).toHaveBeenCalledWith('licensing');
    expect(mockedSetupFleet).toHaveBeenCalledWith(
      core.savedObjects.getUnsafeInternalClient(),
      ctx.elasticsearch.client
    );
  });

  it('resolves fleetSetupCompleted() once setup succeeds', async () => {
    const { plugin, privates, core } = createPlugin();
    jest.mocked(core.plugins.loadPluginContract).mockResolvedValue(mockLicensingContract(true));
    mockedSetupFleet.mockResolvedValue({ isInitialized: true, nonFatalErrors: [] });

    await plugin.lazyInitialize(createLazyInitContext());

    await expect(privates.setupCompletedPromise).resolves.toBeUndefined();
  });

  it('propagates a genuinely fatal setupFleet failure out of lazyInitialize, but still resolves fleetSetupCompleted()', async () => {
    const { plugin, privates, core } = createPlugin();
    jest.mocked(core.plugins.loadPluginContract).mockResolvedValue(mockLicensingContract(true));
    const failure = new Error('SO method mocked to throw');
    mockedSetupFleet.mockRejectedValue(failure);

    const lazyInitializePromise = plugin.lazyInitialize(createLazyInitContext());
    await expect(lazyInitializePromise).rejects.toBe(failure);

    expect(privates.fleetStatus$.getValue().summary).toBe('Fleet setup failed');

    // fleetSetupCompleted() resolves regardless of success/failure, same as the old
    // fleetSetupPromise semantics - it must not reject just because lazyInitialize did.
    await expect(privates.setupCompletedPromise).resolves.toBeUndefined();
  });

  it('propagates a loadPluginContract rejection (licensing contract unavailable) out of lazyInitialize', async () => {
    const { plugin, core } = createPlugin();
    const failure = new Error('licensing contract unavailable');
    jest.mocked(core.plugins.loadPluginContract).mockRejectedValue(failure);

    await expect(plugin.lazyInitialize(createLazyInitContext())).rejects.toBe(failure);
    expect(mockedSetupFleet).not.toHaveBeenCalled();
  });
});
