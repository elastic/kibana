/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import {
  Plugin,
  CoreSetup,
  AppUpdater,
  AppUpdatableFields,
  CoreStart,
  AppMountParameters,
} from '@kbn/core/public';
import { renderApp } from './application';
import './types';

export class CoreAppStatusPlugin implements Plugin<{}, CoreAppStatusPluginStart> {
  private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));

  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'app_status_start',
      title: 'App Status Start Page',
      async mount(params: AppMountParameters) {
        return renderApp('app_status_start', params);
      },
    });

    core.application.register({
      id: 'app_status',
      title: 'App Status',
      euiIconType: 'snowflake',
      updater$: this.appUpdater,
      async mount(params: AppMountParameters) {
        return renderApp('app_status', params);
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    const startContract = {
      setAppStatus: (status: Partial<AppUpdatableFields>) => {
        this.appUpdater.next(() => status);
      },
      navigateToApp: async (appId: string) => {
        return core.application.navigateToApp(appId);
      },
    };
    window._coreAppStatus = startContract;
    return startContract;
  }
  public stop() {}
}

export type CoreAppStatusPluginStart = ReturnType<CoreAppStatusPlugin['start']>;
