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
import { InterceptsTriggerCore } from './core';
import type { ServerConfigSchema } from '../common/config';

export class InterceptsServerPlugin implements Plugin<object, object, object, never> {
  private readonly logger: Logger;
  private readonly config: ServerConfigSchema;
  private readonly interceptsCore?: InterceptsTriggerCore;

  constructor(private initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<ServerConfigSchema>();

    if (this.config.enabled) {
      this.interceptsCore = new InterceptsTriggerCore();
    }
  }

  public setup(core: CoreSetup) {
    this.interceptsCore?.setup(core, this.logger, {
      kibanaVersion: this.initContext.env.packageInfo.version,
    });

    return {};
  }

  public start(core: CoreStart) {
    const interceptCore = this.interceptsCore?.start(core);

    return {
      registerTriggerDefinition: interceptCore?.registerTriggerDefinition.bind(interceptCore),
    };
  }

  public stop() {}
}

export type InterceptSetup = ReturnType<InterceptsServerPlugin['setup']>;
export type InterceptStart = ReturnType<InterceptsServerPlugin['start']>;
