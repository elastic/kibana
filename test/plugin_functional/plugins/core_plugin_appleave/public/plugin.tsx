/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';

export class CoreAppLeavePlugin
  implements Plugin<CoreAppLeavePluginSetup, CoreAppLeavePluginStart>
{
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'appleave1',
      title: 'AppLeave 1',
      appRoute: '/app/appleave1',
      category: DEFAULT_APP_CATEGORIES.kibana,
      async mount(params) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        params.onAppLeave((actions) => actions.confirm('confirm-message', 'confirm-title'));
        return renderApp('AppLeave 1', params, coreStart);
      },
    });
    core.application.register({
      id: 'appleave2',
      title: 'AppLeave 2',
      appRoute: '/app/appleave2',
      category: DEFAULT_APP_CATEGORIES.kibana,
      async mount(params) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        params.onAppLeave((actions) => actions.confirm('confirm-message', 'confirm-title'));
        return renderApp('AppLeave 2', params, coreStart);
      },
    });

    return {};
  }

  public start() {}
  public stop() {}
}

export type CoreAppLeavePluginSetup = ReturnType<CoreAppLeavePlugin['setup']>;
export type CoreAppLeavePluginStart = ReturnType<CoreAppLeavePlugin['start']>;
