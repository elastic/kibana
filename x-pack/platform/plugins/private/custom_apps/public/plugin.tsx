/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';

export interface CustomAppsStartDependencies {
  data: DataPublicPluginStart;
}

export class CustomAppsPlugin implements Plugin {
  public setup(core: CoreSetup<CustomAppsStartDependencies>) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      euiIconType: 'apps',
      order: 8100,
      async mount(params: AppMountParameters) {
        const [coreStart, startDeps] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, startDeps.data, params);
      },
    });
    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
