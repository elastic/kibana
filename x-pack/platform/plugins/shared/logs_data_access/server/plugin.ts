/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { uiSettings } from '../common/ui_settings';
import type { LogsDataAccessConfig } from './config';
import { registerServices } from './services/register_services';
import type { LogsDataAccessPluginStartDeps, LogsDataAccessPluginSetupDeps } from './types';
import { registerSemanticSearchEvent } from './services/semantic_log_search/telemetry_events';

export type LogsDataAccessPluginSetup = ReturnType<LogsDataAccessPlugin['setup']>;
export type LogsDataAccessPluginStart = ReturnType<LogsDataAccessPlugin['start']>;

export class LogsDataAccessPlugin
  implements
    Plugin<
      LogsDataAccessPluginSetup,
      LogsDataAccessPluginStart,
      LogsDataAccessPluginSetupDeps,
      LogsDataAccessPluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly config: LogsDataAccessConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<LogsDataAccessConfig>();
  }
  public setup(core: CoreSetup, plugins: LogsDataAccessPluginSetupDeps) {
    core.uiSettings.register(uiSettings);
    try {
      registerSemanticSearchEvent(core.analytics);
    } catch {
      this.logger.warn('Semantic log search completion telemetry could not be registered.');
    }
  }

  public start(core: CoreStart, plugins: LogsDataAccessPluginStartDeps) {
    const services = registerServices({
      logger: this.logger,
      config: this.config,
      deps: {
        analytics: core.analytics,
        savedObjects: core.savedObjects,
        uiSettings: core.uiSettings,
      },
    });

    return {
      services,
    };
  }
}
