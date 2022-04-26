/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';

declare global {
  interface Window {
    env?: PluginInitializerContext['env'];
  }
}

export class CorePluginDeprecationsPlugin
  implements Plugin<CorePluginDeprecationsPluginSetup, CorePluginDeprecationsPluginStart>
{
  constructor(pluginContext: PluginInitializerContext) {
    window.env = pluginContext.env;
  }
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'core-plugin-deprecations',
      title: 'Core Plugin Deprecations',
      async mount(params) {
        const { renderApp } = await import('./application');
        await core.getStartServices();
        return renderApp(params);
      },
    });
  }

  public start() {}

  public stop() {}
}

export type CorePluginDeprecationsPluginSetup = ReturnType<CorePluginDeprecationsPlugin['setup']>;
export type CorePluginDeprecationsPluginStart = ReturnType<CorePluginDeprecationsPlugin['start']>;
