/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import type { PluginPackage } from '@kbn/repo-packages';
import {
  PluginsSystem,
  PluginWrapper,
  pluginManifestFromPluginPackage,
} from '@kbn/core-plugins-server-internal/plugins_system';
import type {
  PluginsServiceTasksSetupDeps,
  PluginsServiceTasksStartDeps,
} from '@kbn/core-plugins-server-internal/plugins_system';
import { PluginType } from '@kbn/core-base-common';
import type { TaskManagerTasksDefinitions } from '../../tasks';
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

const PACKAGE_INFO = {
  version: POD_KIBANA_VERSION,
  buildFlavor: 'traditional',
  branch: 'main',
  dist: true,
};

/** A task type's definition as registered through `registerTaskDefinitions`. */
export type CapturedTaskDefinition = TaskManagerTasksDefinitions extends Map<string, infer D>
  ? D
  : never;

export interface BootedPod {
  taskDefinitions: TaskManagerTasksDefinitions;
  stop: () => Promise<void>;
}

const readConfigPath = (config: Record<string, unknown>, path: string | string[]) =>
  [path]
    .flat()
    .reduce<unknown>(
      (value, key) => (value && typeof value === 'object' ? (value as never)[key] : undefined),
      config
    );

/**
 * Boots a family of plugins' `server/tasks` entries the way Kibana boots them: Core's own
 * `PluginsSystem` over the plugins' manifests, so dependency order, `setup` then `start`, DI modules
 * and `stop` are Core's, and every plugin only gets the contracts its `tasks` block declares.
 */
export const bootTasksPlugins = async ({
  pluginIds,
  config = {},
}: {
  pluginIds: string[];
  config?: Record<string, unknown>;
}): Promise<BootedPod> => {
  const packages = new Map(
    getPackages(REPO_ROOT)
      .filter((pkg): pkg is PluginPackage => pkg.manifest.type === 'plugin')
      .map((pkg) => [pkg.manifest.plugin.id, pkg])
  );

  // The family lists every plugin it boots; a tasks dependency that is not listed is a mistake in
  // the family, found here, in Kibana's own validation and in the parity test, not at run time.
  for (const id of pluginIds) {
    const pkg = packages.get(id);
    const tasks = pkg?.manifest.plugin.tasks;
    if (!pkg || !tasks) throw new Error(`Plugin '${id}' has no "tasks" entry in its manifest`);
    for (const dependency of tasks.requiredPlugins ?? []) {
      if (!pluginIds.includes(dependency)) {
        throw new Error(
          `Plugin '${id}' requires the tasks entry of '${dependency}', but the family does not list it`
        );
      }
    }
  }

  const logLevel = (process.env.LOG_LEVEL as never) ?? 'info';
  const rootLogger = new PodLogger('plugins', logLevel);
  const coreContext = {
    logger: { get: (...parts: string[]) => rootLogger.get(...parts) },
    env: { mode: { dev: false } },
  };
  const system = new PluginsSystem(coreContext as never, PluginType.tasks);

  for (const id of pluginIds) {
    const pkg = packages.get(id)!;
    const opaqueId = Symbol(id);
    const configHolder: { value?: unknown } = {};
    const initializerContext = {
      opaqueId,
      logger: { get: (...parts: string[]) => rootLogger.get(id, ...parts) },
      config: { get: () => configHolder.value },
      env: { packageInfo: PACKAGE_INFO },
      node: { roles: { backgroundTasks: true, ui: false, migrator: false } },
    };
    const manifest = pluginManifestFromPluginPackage(POD_KIBANA_VERSION, pkg.manifest);
    const wrapper = new PluginWrapper({
      path: pkg.directory,
      manifest,
      opaqueId,
      initializerContext: initializerContext as never,
    }).createTasksWrapper();

    // The tasks entry's own `config` export validates its slice of the pod's config file.
    const descriptor = await wrapper.getConfigDescriptor();
    const raw = readConfigPath(config, manifest.configPath) ?? {};
    configHolder.value = descriptor
      ? (descriptor.schema as never as { validate: Function }).validate(raw)
      : raw;
    system.addPlugin(wrapper);
  }

  const { CoreInjectionService } = await import('@kbn/core-di-server-internal');
  const injection = new CoreInjectionService();
  const injectionSetup = injection.setup();
  const injectionStart = injection.start();

  const elasticsearch = createElasticsearchCore();
  const savedObjects = new PodSavedObjects();
  const uiSettings = createUiSettings();
  const analytics = createAnalytics();
  const http = createHttpStart(config);

  const setupDeps = {
    analytics: analytics.setup,
    http: { basePath: http.basePath },
    injection: injectionSetup,
    savedObjects: savedObjects.setup,
  } as unknown as PluginsServiceTasksSetupDeps;
  const contracts = await system.setupPlugins(setupDeps);

  if (savedObjects.hasTypes) await savedObjects.load();

  const security = createSecurityStart(elasticsearch.internalClient);
  const startDeps = {
    analytics: analytics.start,
    elasticsearch: elasticsearch.start,
    featureFlags: createFeatureFlagsStart(),
    http: { basePath: http.basePath, getServerInfo: http.getServerInfo },
    injection: injectionStart,
    savedObjects: savedObjects.start(
      elasticsearch.internalClient,
      rootLogger.get('savedObjects') as never
    ),
    security: {
      authc: security.authc,
      audit: security.audit,
      serviceAccounts: { asScopedToPlugin: () => security.serviceAccounts },
    },
    uiSettings: uiSettings.start,
    userProfile: createUserProfileStart(elasticsearch.internalClient),
  } as unknown as PluginsServiceTasksStartDeps;
  await system.startPlugins(startDeps);

  const taskManager = contracts.get('taskManager') as
    | { getRegisteredTaskDefinitions: () => TaskManagerTasksDefinitions }
    | undefined;
  if (!taskManager) throw new Error("The pod family must include the 'taskManager' plugin");

  return {
    taskDefinitions: taskManager.getRegisteredTaskDefinitions(),
    stop: () => system.stopPlugins(),
  };
};
