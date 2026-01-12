/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/server';
import {
  type CoreSetup,
  type CoreStart,
  type PluginInitializerContext,
  type Logger,
} from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { InterceptsTriggerOrchestrator } from './orchestrator';
import type { ServerConfigSchema } from '../common/config';
import {
  interceptTriggerRecordSavedObject,
  interceptInteractionUserRecordSavedObject,
} from './saved_objects';

interface InterceptsServerSetupDeps {
  usageCollection?: UsageCollectionSetup;
}

export class InterceptsServerPlugin
  implements Plugin<object, object, InterceptsServerSetupDeps, never>
{
  private readonly logger: Logger;
  private readonly config: ServerConfigSchema;
  private readonly interceptsOrchestrator?: InterceptsTriggerOrchestrator;

  constructor(private initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<ServerConfigSchema>();

    if (this.config.enabled && initContext.node.roles.ui) {
      this.interceptsOrchestrator = new InterceptsTriggerOrchestrator();
    }
  }

  public setup(core: CoreSetup, { usageCollection }: InterceptsServerSetupDeps) {
    // Always register saved objects unconditionally to ensure mappings are created
    // during setup, regardless of plugin configuration or node roles
    core.savedObjects.registerType(interceptTriggerRecordSavedObject);
    core.savedObjects.registerType(interceptInteractionUserRecordSavedObject);

    this.interceptsOrchestrator?.setup(core, {
      logger: this.logger,
      kibanaVersion: this.initContext.env.packageInfo.version,
      usageCollection,
    });

    return {};
  }

  public start(core: CoreStart) {
    const interceptOrchestratorStart = this.interceptsOrchestrator?.start(core);

    return {
      registerTriggerDefinition: interceptOrchestratorStart?.registerTriggerDefinition.bind(
        interceptOrchestratorStart
      ),
    };
  }

  public stop() {}
}

export type InterceptSetup = ReturnType<InterceptsServerPlugin['setup']>;
export type InterceptStart = ReturnType<InterceptsServerPlugin['start']>;
