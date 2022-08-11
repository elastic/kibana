/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { renderApp } from './app';

export class CoreAppLinkPlugin implements Plugin<CoreAppLinkPluginSetup, CoreAppLinkPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'core_history_block',
      title: 'History block test',
      mount: async (params: AppMountParameters) => {
        const [{ application }] = await core.getStartServices();
        return renderApp(
          {
            basePath: core.http.basePath,
            application,
          },
          params
        );
      },
    });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}

export type CoreAppLinkPluginSetup = ReturnType<CoreAppLinkPlugin['setup']>;
export type CoreAppLinkPluginStart = ReturnType<CoreAppLinkPlugin['start']>;
