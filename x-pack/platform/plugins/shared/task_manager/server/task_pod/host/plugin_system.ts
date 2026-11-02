/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Container } from 'inversify';
import type { ServiceToken } from '@kbn/core-di';
import { TASK_MANAGER_POD_METHODS } from '../task_manager_contract';
import type { PodPluginDefinition, PodPluginInitializerContext } from './define_pod_plugin';
import { remoteContract } from './remote';
import { PodLogger } from './logger';
import { createElasticsearchCore } from './core/elasticsearch';
import { PodSavedObjects } from './core/saved_objects';
import { POD_KIBANA_VERSION } from './version';
import {
  createAnalytics,
  createFeatureFlagsStart,
  createHttpStart,
  createSecurityStart,
  createUiSettings,
  createUserProfileStart,
} from './core/small_services';

const importDi = async () => {
  const { CoreInjectionService } = await import('@kbn/core-di-server-internal');
  const injection = new CoreInjectionService();
  return {
    di: await import('@kbn/core-di'),
    internal: await import('@kbn/core-di-internal'),
    injectionSetup: injection.setup(),
    injectionStart: injection.start(),
  };
};

/** A task type's definition as captured from `registerTaskDefinitions` during pod plugin setup. */
export interface CapturedTaskDefinition {
  readonly taskType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly createTaskRunner: (context: any) => {
    run(): Promise<unknown>;
    cancel?(): Promise<unknown>;
  };
}

export interface BootedPod {
  taskDefinitions: Map<string, CapturedTaskDefinition>;
}

const PACKAGE_INFO = {
  version: POD_KIBANA_VERSION,
  buildFlavor: 'traditional',
  branch: 'main',
  dist: true,
};

/** Task Manager as seen by a pod plugin: registration is local, everything else calls Kibana. */
const createTaskManagerPodPlugin = (
  taskDefinitions: Map<string, CapturedTaskDefinition>
): PodPluginDefinition => ({
  id: 'taskManager',
  setup: () => ({
    index: '.kibana_task_manager',
    addMiddleware: () => undefined,
    registerTaskDefinitions: (definitions: Record<string, { createTaskRunner: never }>) => {
      for (const [taskType, definition] of Object.entries(definitions)) {
        taskDefinitions.set(taskType, { ...definition, taskType });
      }
    },
    registerCanEncryptedSavedObjects: () => undefined,
    registerTaskEventLogger: () => undefined,
    registerPodContract: () => {
      throw new Error('registerPodContract is only available in Kibana');
    },
  }),
  start: () => remoteContract('taskManager', [...TASK_MANAGER_POD_METHODS]),
});

/** Orders plugins so every plugin comes after the plugins it depends on; fails on a missing required one. */
export const sortPlugins = (plugins: PodPluginDefinition[]): PodPluginDefinition[] => {
  const byId = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  const sorted: PodPluginDefinition[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (plugin: PodPluginDefinition, trail: string[]) => {
    if (state.get(plugin.id) === 'done') return;
    if (state.get(plugin.id) === 'visiting') {
      throw new Error(`Pod plugin dependency cycle: ${[...trail, plugin.id].join(' -> ')}`);
    }
    state.set(plugin.id, 'visiting');
    for (const dependency of plugin.requiredPlugins ?? []) {
      const found = byId.get(dependency);
      if (!found) {
        throw new Error(
          `Pod plugin '${plugin.id}' requires '${dependency}', but no pod plugin provides it. ` +
            `Add a local or remote pod plugin for '${dependency}' to this pod.`
        );
      }
      visit(found, [...trail, plugin.id]);
    }
    for (const dependency of plugin.optionalPlugins ?? []) {
      const found = byId.get(dependency);
      if (found) visit(found, [...trail, plugin.id]);
    }
    state.set(plugin.id, 'done');
    sorted.push(plugin);
  };

  plugins.forEach((plugin) => visit(plugin, []));
  return sorted;
};

const readConfigPath = (config: Record<string, unknown>, path: string[] = []) =>
  path.reduce<unknown>(
    (value, key) => (value && typeof value === 'object' ? (value as never)[key] : undefined),
    config
  );

/**
 * Boots pod plugins the way Kibana boots plugins: dependency order, one setup phase then one start
 * phase, DI plugins through Core's own `CoreInjectionService` and lifecycle modules (so `OnSetup` /
 * `OnStart`, `fork()` and the derived tokens like `SavedObjectsClientFactory` are the real ones),
 * classic plugins through their `setup()` / `start()`.
 */
export const bootPod = async ({
  plugins,
  config = {},
}: {
  plugins: PodPluginDefinition[];
  config?: Record<string, unknown>;
}): Promise<BootedPod> => {
  const taskDefinitions = new Map<string, CapturedTaskDefinition>();
  const ordered = sortPlugins([createTaskManagerPodPlugin(taskDefinitions), ...plugins]);

  const logLevel = (process.env.LOG_LEVEL as never) ?? 'info';
  const rootLogger = new PodLogger('plugins', logLevel);
  const elasticsearch = createElasticsearchCore();
  const savedObjects = new PodSavedObjects();
  const uiSettings = createUiSettings();
  const analytics = createAnalytics();

  // Only DI plugins need the injection machinery (inversify and Core's lifecycle modules), so it is
  // a separate chunk that a pod made of classic plugins never loads.
  const di = ordered.some((plugin) => plugin.module) ? await importDi() : undefined;
  const getDi = () => {
    if (!di) throw new Error('DI is only loaded for pods that contain a DI plugin');
    return di;
  };

  type StartServices = [unknown, Record<string, unknown>, Record<string, unknown>];
  let resolveStartServices: (value: StartServices) => void = () => undefined;
  const startServices = new Promise<StartServices>((resolve) => (resolveStartServices = resolve));
  const setupContracts: Record<string, unknown> = {};
  const startContracts: Record<string, unknown> = {};

  const coreSetup = {
    savedObjects: savedObjects.setup,
    uiSettings: uiSettings.setup,
    analytics: analytics.setup,
    getStartServices: () => startServices,
  };

  // `getStartServices` hands each plugin its own Core start (its own `injection` scope).
  const coreSetupFor = (plugin: PodPluginDefinition) => ({
    ...coreSetup,
    getStartServices: () =>
      startServices.then(([, contracts, rest]) => [coreStartFor(plugin), contracts, rest]),
  });

  const contexts = new Map<string, PodPluginInitializerContext>();
  const containers = new Map<string, Container>();
  for (const plugin of ordered) {
    const pluginConfig = plugin.configSchema
      ? plugin.configSchema.validate(readConfigPath(config, plugin.configPath) ?? {})
      : readConfigPath(config, plugin.configPath) ?? {};
    contexts.set(plugin.id, {
      opaqueId: Symbol(plugin.id),
      logger: { get: (...parts: string[]) => rootLogger.get(plugin.id, ...parts) },
      config: { get: () => pluginConfig as never },
      env: { packageInfo: PACKAGE_INFO },
      node: { roles: { backgroundTasks: true, ui: false, migrator: false } },
    });
  }

  const dependenciesOf = (plugin: PodPluginDefinition, contracts: Record<string, unknown>) =>
    Object.fromEntries(
      [...(plugin.requiredPlugins ?? []), ...(plugin.optionalPlugins ?? [])]
        .filter((id) => id in contracts)
        .map((id) => [id, contracts[id]])
    );

  for (const plugin of ordered) {
    const context = contexts.get(plugin.id)!;
    const deps = dependenciesOf(plugin, setupContracts);
    let contract: unknown;
    if (plugin.module) {
      const { di: coreDi, internal, injectionSetup } = getDi();
      const container = injectionSetup.getContainer(context.opaqueId as never) as Container;
      containers.set(plugin.id, container);
      container.load(plugin.module);
      container.load(internal.createSetupModule(context as never, coreSetupFor(plugin), deps));
      contract = container.get(coreDi.Setup as ServiceToken<unknown>);
    }
    contract = (await plugin.setup?.(coreSetupFor(plugin), deps, context)) ?? contract;
    setupContracts[plugin.id] = contract ?? {};
  }

  if (savedObjects.hasTypes) await savedObjects.load();

  const coreStartFor = (plugin: PodPluginDefinition) => ({
    elasticsearch: elasticsearch.start,
    savedObjects: savedObjects.start(
      elasticsearch.internalClient,
      rootLogger.get('savedObjects') as never
    ),
    http: createHttpStart(config),
    security: createSecurityStart(),
    userProfile: createUserProfileStart(),
    featureFlags: createFeatureFlagsStart(),
    uiSettings: uiSettings.start,
    analytics: analytics.start,
    // The plugin-scoped `injection` Core hands each plugin: `fork()` is a child of this plugin's scope.
    injection: {
      fork: () => getDi().injectionStart.fork(contexts.get(plugin.id)!.opaqueId as never),
      getContainer: () =>
        getDi().injectionStart.getContainer(contexts.get(plugin.id)!.opaqueId as never),
    },
  });

  for (const plugin of ordered) {
    const context = contexts.get(plugin.id)!;
    const deps = dependenciesOf(plugin, startContracts);
    const coreStart = coreStartFor(plugin);
    let contract: unknown;
    const container = containers.get(plugin.id);
    if (container) {
      const { di: coreDi, internal } = getDi();
      container.load(internal.createStartModule(coreStart as never, deps));
      contract = await container.get(coreDi.Start as ServiceToken<unknown>);
    }
    contract = (await plugin.start?.(coreStart, deps, context)) ?? contract;
    startContracts[plugin.id] = contract ?? {};
  }

  resolveStartServices([coreStartFor(ordered[0]), startContracts, {}]);

  return { taskDefinitions };
};
