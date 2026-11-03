/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { schema } from '@kbn/config-schema';
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
import { createPluginInitializerContext } from '@kbn/core-plugins-server-internal/src/plugin_context';
import { PluginType } from '@kbn/core-base-common';
import type { FakeRequestEnricher } from '@kbn/core-security-server';
import type { TaskManagerTasksDefinitions } from '../../tasks';
import { PodLogger } from './logger';
import { createDataStreams } from './core/data_streams';
import { createPodCoreContext } from './core/core_context';
import { createElasticsearchCore } from './core/es_cluster';
import { PodSavedObjects } from './core/pod_saved_objects';
import {
  PodCoreServices,
  registerCoreConfigSchemas,
  withPodFeatureFlagOverrides,
} from './core/core_services';
import { createServerInfo } from './core/server_info';
import { POD_KIBANA_VERSION } from './version';

/** A task type's definition as registered through `registerTaskDefinitions`. */
export type CapturedTaskDefinition = TaskManagerTasksDefinitions extends Map<string, infer D>
  ? D
  : never;

export interface BootedPod {
  taskDefinitions: TaskManagerTasksDefinitions;
  /** Binds a run's user to its fake request: Core's `acquireFakeRequestEnricher`. */
  enrichFakeRequest: FakeRequestEnricher;
  stop: () => Promise<void>;
}

/**
 * Boots a family of plugins' `server/tasks` entries the way Kibana boots them: Core's own
 * `PluginsSystem` over the plugins' manifests, so dependency order, `setup` then `start`, DI modules
 * and `stop` are Core's, and every plugin only gets the contracts its `tasks` block declares.
 *
 * Core services are Core's own classes (`ConfigService`, `ClusterClient`, `AnalyticsService`,
 * `FeatureFlagsService`, `UiSettingsService`, `SecurityService`, `UserProfileService`, `BasePath`,
 * the saved objects building blocks), wired for a process with no HTTP server. The stand-ins that
 * remain, and why, are listed in `README.md` ("What is real in a pod").
 */
export const bootTasksPlugins = async ({
  pluginIds,
  config: podConfig = {},
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

  const config = withPodFeatureFlagOverrides(podConfig);
  const logLevel = (process.env.LOG_LEVEL as never) ?? 'info';
  const rootLogger = new PodLogger('plugins', logLevel);
  const coreContext = createPodCoreContext({ config, logger: rootLogger });
  const { configService } = coreContext;
  registerCoreConfigSchemas(coreContext);
  const system = new PluginsSystem(coreContext, PluginType.tasks);

  const configPaths = new Set<string>();
  const instanceInfo = { uuid: randomUUID(), airgapped: false };
  const nodeInfo = { roles: { backgroundTasks: true, ui: false, migrator: false } };
  for (const id of pluginIds) {
    const pkg = packages.get(id)!;
    const opaqueId = Symbol(id);
    const manifest = pluginManifestFromPluginPackage(POD_KIBANA_VERSION, pkg.manifest);
    const initializerContext = createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
    });
    const wrapper = new PluginWrapper({
      path: pkg.directory,
      manifest,
      opaqueId,
      initializerContext,
    }).createTasksWrapper();

    // The tasks entry's own `config` export validates its slice of the pod's config file, through
    // Core's `ConfigService` like a server entry's. A plugin without one reads its slice unvalidated.
    const descriptor = await wrapper.getConfigDescriptor();
    const path = [manifest.configPath].flat().join('.');
    if (!configPaths.has(path)) {
      configPaths.add(path);
      configService.setSchema(manifest.configPath, (descriptor?.schema as never) ?? schema.any());
      if (descriptor?.deprecations) {
        configService.addDeprecationProvider(manifest.configPath, descriptor.deprecations);
      }
    }
    system.addPlugin(wrapper);
  }
  await configService.validate({ logDeprecations: false });

  const { CoreInjectionService } = await import('@kbn/core-di-server-internal');
  const injection = new CoreInjectionService();
  const injectionSetup = injection.setup();
  const injectionStart = injection.start();

  const elasticsearch = createElasticsearchCore(coreContext, config);
  const savedObjects = new PodSavedObjects();
  const core = new PodCoreServices(coreContext, config);
  const dataStreams = createDataStreams(elasticsearch.internalClient as never);
  const coreSetup = await core.setup({
    savedObjects: savedObjects.setup as never,
    internalClient: elasticsearch.internalClient,
  });

  const setupDeps = {
    analytics: coreSetup.analytics,
    dataStreams: dataStreams.setup,
    http: { basePath: core.basePath },
    injection: injectionSetup,
    savedObjects: savedObjects.setup,
    uiSettings: coreSetup.uiSettings,
  } as unknown as PluginsServiceTasksSetupDeps;
  const contracts = await system.setupPlugins(setupDeps);

  if (savedObjects.hasTypes) await savedObjects.load();

  const coreStart = await core.start();
  const startDeps = {
    analytics: coreStart.analytics,
    dataStreams: dataStreams.start,
    elasticsearch: elasticsearch.start,
    featureFlags: coreStart.featureFlags,
    http: { basePath: core.basePath, getServerInfo: createServerInfo(config) },
    injection: injectionStart,
    savedObjects: savedObjects.start(
      elasticsearch.internalClient as never,
      rootLogger.get('savedObjects') as never
    ),
    security: coreStart.security,
    uiSettings: coreStart.uiSettings,
    userProfile: coreStart.userProfile,
  } as unknown as PluginsServiceTasksStartDeps;
  await system.startPlugins(startDeps);

  const taskManager = contracts.get('taskManager') as
    | { getRegisteredTaskDefinitions: () => TaskManagerTasksDefinitions }
    | undefined;
  if (!taskManager) throw new Error("The pod family must include the 'taskManager' plugin");

  return {
    taskDefinitions: taskManager.getRegisteredTaskDefinitions(),
    enrichFakeRequest: coreSetup.enrichFakeRequest,
    stop: async () => {
      await system.stopPlugins();
      await core.stop();
      await elasticsearch.stop();
    },
  };
};
