/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { coreMock } from '@kbn/core/server/mocks';
import { OSQUERY_SEARCH_STRATEGY } from './search_strategy/constants';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { OsqueryPlugin } from './plugin';
import type { SetupPlugins } from './types';

vi.mock('./search_strategy/osquery', () => {
      const mocked = {
      osquerySearchStrategyProvider: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./utils/register_features', () => {
      const mocked = { registerFeatures: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./saved_objects', () => {
      const mocked = { initSavedObjects: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./routes', () => {
      const mocked = { defineRoutes: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./handlers/action/create_action_service', () => {
      const mocked = {
      createActionService: vi.fn(() => ({ stop: vi.fn() })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./create_config', () => {
      const mocked = {
      createConfig: vi.fn(() => ({ experimentalFeatures: { rruleScheduling: false } })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./lib/reconcile_schedule_ids_task', () => {
      const mocked = {
      RECONCILE_TASK_TYPE: 'osquery:reconcile-schedule-ids',
      runReconcileTask: vi.fn(),
      scheduleReconcileTask: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./lib/osquery_app_context_services', () => {
      const mocked = {
      OsqueryAppContextService: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./lib/telemetry/sender', () => {
      const mocked = {
      TelemetryEventsSender: vi.fn(() => ({ setup: vi.fn(), start: vi.fn(), stop: vi.fn() })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./lib/telemetry/receiver', () => {
      const mocked = {
      TelemetryReceiver: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./lib/schema_service', () => {
      const mocked = { SchemaService: vi.fn(() => ({})) };
      return { ...mocked, default: mocked };
    });

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('OsqueryPlugin setup', () => {
  const createSetupDeps = () => {
    const registerSearchStrategy = vi.fn();
    const core = coreMock.createSetup();
    const dataStart = { data: { search: {} } };

    core.getStartServices = vi
      .fn()
      .mockResolvedValue([coreMock.createStart(), dataStart, {}]) as typeof core.getStartServices;

    const plugins = {
      features: { registerKibanaFeature: vi.fn() },
      security: { authz: {} },
      data: { search: { registerSearchStrategy } },
      taskManager: { registerTaskDefinitions: vi.fn() },
      licensing: {},
    } as unknown as SetupPlugins;

    return { core, plugins, registerSearchStrategy };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the osquery search strategy once under the OSQUERY_SEARCH_STRATEGY symbol', async () => {
    const strategyInstance = { search: vi.fn(), cancel: vi.fn() };
    (osquerySearchStrategyProvider as Mock).mockReturnValue(strategyInstance);

    const { core, plugins, registerSearchStrategy } = createSetupDeps();
    const plugin = new OsqueryPlugin(coreMock.createPluginInitializerContext());

    plugin.setup(core, plugins);
    await flushPromises();

    expect(registerSearchStrategy).toHaveBeenCalledTimes(1);
    const [strategyKey, registeredStrategy] = registerSearchStrategy.mock.calls[0];
    // Reference equality guards against a copied/renamed strategy key silently
    // registering under a symbol other than the one routes import.
    expect(strategyKey).toBe(OSQUERY_SEARCH_STRATEGY);
    expect(registeredStrategy).toBe(strategyInstance);
  });

  it('builds the strategy with the osquery app context (security + service)', async () => {
    const { core, plugins } = createSetupDeps();
    const plugin = new OsqueryPlugin(coreMock.createPluginInitializerContext());

    plugin.setup(core, plugins);
    await flushPromises();

    expect(osquerySearchStrategyProvider).toHaveBeenCalledTimes(1);
    const osqueryContext = (osquerySearchStrategyProvider as Mock).mock.calls[0][2];
    expect(osqueryContext).toEqual(
      expect.objectContaining({
        security: plugins.security,
        service: expect.any(Object),
      })
    );
  });
});
