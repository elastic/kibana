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

import { CoreSetup, Plugin, AppMountParameters } from 'kibana/public';
import { NavigationPublicPluginSetup } from '../../../../../src/plugins/navigation/public';
import { AppPluginDependencies } from './types';

export class TopNavTestPlugin implements Plugin<TopNavTestPluginSetup, TopNavTestPluginStart> {
  public setup(core: CoreSetup, { navigation }: { navigation: NavigationPublicPluginSetup }) {
    const customExtension = {
      id: 'registered-prop',
      label: 'Registered Button',
      description: 'Registered Demo',
      run() {},
      testId: 'demoRegisteredNewButton',
    };

    navigation.registerMenuItem(customExtension);

    const customDiscoverExtension = {
      id: 'registered-discover-prop',
      label: 'Registered Discover Button',
      description: 'Registered Discover Demo',
      run() {},
      testId: 'demoDiscoverRegisteredNewButton',
      appName: 'discover',
    };

    navigation.registerMenuItem(customDiscoverExtension);

    core.application.register({
      id: 'topNavMenu',
      title: 'Top nav menu example',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const services = await core.getStartServices();
        return renderApp(services[1] as AppPluginDependencies, params);
      },
    });

    return {};
  }

  public start() {}
  public stop() {}
}

export type TopNavTestPluginSetup = ReturnType<TopNavTestPlugin['setup']>;
export type TopNavTestPluginStart = ReturnType<TopNavTestPlugin['start']>;
