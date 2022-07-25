/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';

export class CorePluginAPlugin implements Plugin<CorePluginAPluginSetup, CorePluginAPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'foo',
      title: 'Foo',
      async mount(params) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    return {
      getGreeting() {
        return 'Hello from Plugin A!';
      },
    };
  }

  public start() {}
  public stop() {}
}

export type CorePluginAPluginSetup = ReturnType<CorePluginAPlugin['setup']>;
export type CorePluginAPluginStart = ReturnType<CorePluginAPlugin['start']>;
