/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  Plugin,
  CoreSetup,
  PluginInitializerContext,
  AppMountParameters,
} from '@kbn/core/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';
import type {
  AutomaticImportPluginSetup,
  AutomaticImportPluginStart,
  AutomaticImportPluginStartDependencies,
} from './types';
import { Telemetry } from './services/telemetry/service';

export class AutomaticImportPlugin
  implements Plugin<AutomaticImportPluginSetup, AutomaticImportPluginStart> {
  private telemetry = new Telemetry();

  constructor(_: PluginInitializerContext) { }

  public setup(
    core: CoreSetup<AutomaticImportPluginStartDependencies, AutomaticImportPluginStart>
  ): AutomaticImportPluginSetup {
    this.telemetry.setup(core.analytics);

    const telemetry = this.telemetry;
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, plugins] = await core.getStartServices();
        return renderApp({
          coreStart,
          plugins,
          params,
          telemetry: telemetry.start(),
        });
      },
    });

    return {};
  }

  public start(
    _core: CoreStart,
    _dependencies: AutomaticImportPluginStartDependencies
  ): AutomaticImportPluginStart {
    return {};
  }

  public stop() { }
}
