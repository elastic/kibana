/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import { CorePluginAPluginSetup } from '../../core_plugin_a/public/plugin';

declare global {
  interface Window {
    env?: PluginInitializerContext['env'];
  }
}

export interface CorePluginBDeps {
  core_plugin_a: CorePluginAPluginSetup;
}

export class CorePluginBPlugin
  implements Plugin<CorePluginBPluginSetup, CorePluginBPluginStart, CorePluginBDeps> {
  constructor(pluginContext: PluginInitializerContext) {
    window.env = pluginContext.env;
  }
  public setup(core: CoreSetup, deps: CorePluginBDeps) {
    core.application.register({
      id: 'bar',
      title: 'Bar',
      async mount(params) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    return {
      sayHi() {
        return `Plugin A said: ${deps.core_plugin_a.getGreeting()}`;
      },
    };
  }

  public async start(core: CoreStart, deps: {}) {
    return {
      sendSystemRequest: async (asSystemRequest: boolean) => {
        const response = await core.http.post<string>('/core_plugin_b/system_request', {
          asSystemRequest,
        });
        return `/core_plugin_b/system_request says: "${response}"`;
      },
    };
  }

  public stop() {}
}

export type CorePluginBPluginSetup = ReturnType<CorePluginBPlugin['setup']>;
export type CorePluginBPluginStart = ReturnType<CorePluginBPlugin['start']>;
