/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';

export class CoreAppLeavePlugin
  implements Plugin<CoreAppLeavePluginSetup, CoreAppLeavePluginStart>
{
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'appleave1',
      title: 'AppLeave 1',
      async mount(params) {
        const { renderApp } = await import('./application');
        params.onAppLeave((actions) => actions.confirm('confirm-message', 'confirm-title'));
        return renderApp('AppLeave 1', params);
      },
    });
    core.application.register({
      id: 'appleave2',
      title: 'AppLeave 2',
      async mount(params) {
        const { renderApp } = await import('./application');
        params.onAppLeave((actions) => actions.default());
        return renderApp('AppLeave 2', params);
      },
    });

    return {};
  }

  public start() {}
  public stop() {}
}

export type CoreAppLeavePluginSetup = ReturnType<CoreAppLeavePlugin['setup']>;
export type CoreAppLeavePluginStart = ReturnType<CoreAppLeavePlugin['start']>;
