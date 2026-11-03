/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { ActionsTasksSetup } from '@kbn/actions-plugin/server/tasks';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import { registerConnectorTypes } from '../connector_types';
import { registerConnectorTypesFromSpecs } from '../connector_types_from_spec';
import { configSchema, type ConfigSchema as StackConnectorsConfigType } from '../config';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import { parseExperimentalConfigValue } from '../../common/experimental_features';

interface TasksSetupDeps {
  actions: ActionsTasksSetup;
}

interface TasksStartDeps {
  licensing: LicensingTasksStart;
}

/**
 * The stack connector types for task runtimes: the same registration the plugin does, without its
 * routes and usage collection. Serverless trial status comes from Cloud config, which task
 * runtimes do not have, so only the license decides whether the Elastic-managed email service is
 * available.
 */
class StackConnectorsTasksPlugin
  implements TasksPlugin<void, void, TasksSetupDeps, TasksStartDeps>
{
  private readonly experimentalFeatures: ExperimentalFeatures;
  private licensing?: LicensingTasksStart;

  constructor(context: PluginInitializerContext<StackConnectorsConfigType>) {
    this.experimentalFeatures = parseExperimentalConfigValue(
      context.config.get().enableExperimental || []
    );
  }

  setup(core: CoreTasksSetup<TasksStartDeps, void>, { actions }: TasksSetupDeps) {
    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      experimentalFeatures: this.experimentalFeatures,
      isElasticCloudTrial: async () => (await this.licensing?.getLicense())?.type === 'trial',
      getUiSettingsClient: async (savedObjectsClient) => {
        const [coreStart] = await core.getStartServices();
        return coreStart.uiSettings.asScopedToClient(savedObjectsClient);
      },
      getInternalEsClient: async () => {
        const [coreStart] = await core.getStartServices();
        return coreStart.elasticsearch.client.asInternalUser;
      },
    });

    if (this.experimentalFeatures.connectorsFromSpecs) {
      registerConnectorTypesFromSpecs({ actions });
    }
  }

  start(_core: CoreTasksStart, { licensing }: TasksStartDeps) {
    this.licensing = licensing;
  }
}

export const plugin = async (context: PluginInitializerContext<StackConnectorsConfigType>) =>
  new StackConnectorsTasksPlugin(context);

export const config: PluginConfigDescriptor<StackConnectorsConfigType> = { schema: configSchema };
