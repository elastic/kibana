/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  type CoreSetup,
  type CoreStart,
  type PluginInitializerContext,
  type Logger,
} from '@kbn/core/server';
import { InterceptsTriggerOrchestrator } from './orchestrator';
import type { ServerConfigSchema } from '../common/config';

export class InterceptsServerPlugin implements Plugin<object, object, object, never> {
  private readonly logger: Logger;
  private readonly config: ServerConfigSchema;
  private readonly interceptsOrchestrator?: InterceptsTriggerOrchestrator;

  constructor(private initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<ServerConfigSchema>();

    if (this.config.enabled) {
      this.interceptsOrchestrator = new InterceptsTriggerOrchestrator();
    }
  }

  public setup(core: CoreSetup) {
    this.interceptsOrchestrator?.setup(core, this.logger, {
      kibanaVersion: this.initContext.env.packageInfo.version,
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
