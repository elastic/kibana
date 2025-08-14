/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { Logger, PluginInitializerContext } from '@kbn/core/server';
import { registerServerRoutes } from './routes/register_routes';
import type {
  GenAiSettingsPluginSetupDependencies,
  GenAiSettingsPluginStartDependencies,
} from './types';
import type { GenAiSettingsRouteHandlerResources } from './routes/types';

export type GenAiSettingsPluginSetup = Record<string, never>;
export type GenAiSettingsPluginStart = Record<string, never>;

export class GenAiSettingsPlugin
  implements
    Plugin<
      GenAiSettingsPluginSetup,
      GenAiSettingsPluginStart,
      GenAiSettingsPluginSetupDependencies,
      GenAiSettingsPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup<GenAiSettingsPluginStartDependencies>,
    plugins: GenAiSettingsPluginSetupDependencies
  ): GenAiSettingsPluginSetup {
    const routeHandlerPlugins: Pick<
      GenAiSettingsRouteHandlerResources['plugins'],
      'actions' | 'inference'
    > = {
      actions: {
        setup: plugins.actions,
        start: () => core.getStartServices().then(([, starts]) => starts.actions),
      },
      inference: {
        setup: plugins.inference,
        start: () => core.getStartServices().then(([, starts]) => starts.inference),
      },
    };

    const withCore = {
      ...routeHandlerPlugins,
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
    } as GenAiSettingsRouteHandlerResources['plugins'];

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        plugins: withCore,
      },
      isDev: false,
    });

    return {};
  }

  public start(core: CoreStart): GenAiSettingsPluginStart {
    return {};
  }

  public stop() {}
}
