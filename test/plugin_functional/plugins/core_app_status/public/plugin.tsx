/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { BehaviorSubject } from 'rxjs';
import {
  Plugin,
  CoreSetup,
  AppUpdater,
  AppUpdatableFields,
  CoreStart,
  AppMountParameters,
} from 'kibana/public';
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
