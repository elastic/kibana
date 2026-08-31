/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { OSQUERY_SEARCH_STRATEGY } from './search_strategy/constants';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { OsqueryPlugin } from './plugin';
import type { SetupPlugins } from './types';

jest.mock('./search_strategy/osquery', () => ({
  osquerySearchStrategyProvider: jest.fn(),
}));
jest.mock('./utils/register_features', () => ({ registerFeatures: jest.fn() }));
jest.mock('./saved_objects', () => ({ initSavedObjects: jest.fn() }));
jest.mock('./routes', () => ({ defineRoutes: jest.fn() }));
jest.mock('./handlers/action/create_action_service', () => ({
  createActionService: jest.fn(() => ({ stop: jest.fn() })),
}));
jest.mock('./create_config', () => ({
  createConfig: jest.fn(() => ({ experimentalFeatures: { rruleScheduling: false } })),
}));
jest.mock('./lib/reconcile_schedule_ids_task', () => ({
  RECONCILE_TASK_TYPE: 'osquery:reconcile-schedule-ids',
  runReconcileTask: jest.fn(),
  scheduleReconcileTask: jest.fn(),
}));
jest.mock('./lib/osquery_app_context_services', () => ({
  OsqueryAppContextService: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));
jest.mock('./lib/telemetry/sender', () => ({
  TelemetryEventsSender: jest.fn(() => ({ setup: jest.fn(), start: jest.fn(), stop: jest.fn() })),
}));
jest.mock('./lib/telemetry/receiver', () => ({
  TelemetryReceiver: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));
jest.mock('./lib/schema_service', () => ({ SchemaService: jest.fn(() => ({})) }));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('OsqueryPlugin setup', () => {
  const createSetupDeps = () => {
    const registerSearchStrategy = jest.fn();
    const core = coreMock.createSetup();
    const dataStart = { data: { search: {} } };

    core.getStartServices = jest
      .fn()
      .mockResolvedValue([coreMock.createStart(), dataStart, {}]) as typeof core.getStartServices;

    const plugins = {
      features: { registerKibanaFeature: jest.fn() },
      security: { authz: {} },
      data: { search: { registerSearchStrategy } },
      taskManager: { registerTaskDefinitions: jest.fn() },
      licensing: {},
    } as unknown as SetupPlugins;

    return { core, plugins, registerSearchStrategy };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the osquery search strategy once under the OSQUERY_SEARCH_STRATEGY symbol', async () => {
    const strategyInstance = { search: jest.fn(), cancel: jest.fn() };
    (osquerySearchStrategyProvider as jest.Mock).mockReturnValue(strategyInstance);

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
    const osqueryContext = (osquerySearchStrategyProvider as jest.Mock).mock.calls[0][2];
    expect(osqueryContext).toEqual(
      expect.objectContaining({
        security: plugins.security,
        service: expect.any(Object),
      })
    );
  });
});
