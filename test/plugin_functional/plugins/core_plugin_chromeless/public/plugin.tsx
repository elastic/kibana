/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';

export class CorePluginChromelessPlugin
  implements Plugin<CorePluginChromelessPluginSetup, CorePluginChromelessPluginStart>
{
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'chromeless',
      title: 'Chromeless',
      chromeless: true,
      async mount(params) {
        const { renderApp } = await import('./application');
        return renderApp(params);
      },
    });
  }

  public start() {}
  public stop() {}
}

export type CorePluginChromelessPluginSetup = ReturnType<CorePluginChromelessPlugin['setup']>;
export type CorePluginChromelessPluginStart = ReturnType<CorePluginChromelessPlugin['start']>;
