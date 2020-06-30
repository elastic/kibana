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

import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { renderApp } from './app';

export class CoreAppLinkPlugin implements Plugin<CoreAppLinkPluginSetup, CoreAppLinkPluginStart> {
  public async setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'applink_start',
      title: 'AppLink Start',
      mount: async (params: AppMountParameters) => {
        const [{ application }] = await core.getStartServices();
        return renderApp(
          {
            appId: 'applink_start',
            targetAppId: 'applink_end',
            basePath: core.http.basePath,
            application,
          },
          params
        );
      },
    });
    core.application.register({
      id: 'applink_end',
      title: 'AppLink End',
      mount: async (params: AppMountParameters) => {
        const [{ application }] = await core.getStartServices();
        return renderApp(
          {
            appId: 'applink_end',
            targetAppId: 'applink_start',
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
