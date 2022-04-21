/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, AppMountParameters } from '@kbn/core/public';
import { NavigationPublicPluginSetup } from '@kbn/navigation-plugin/public';
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
