/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CUSTOM_APPS_CATEGORY, PLUGIN_ID, PLUGIN_NAME } from '../common/constants';
import { CustomAppsNavLinks } from './nav_links';

export interface CustomAppsStartDependencies {
  data: DataPublicPluginStart;
}

export interface CustomAppsPluginStart {
  /** Rebuilds the side navigation entries after an app is saved or deleted. */
  refreshNavLinks: () => void;
}

export class CustomAppsPlugin implements Plugin<{}, CustomAppsPluginStart> {
  private readonly navLinks = new CustomAppsNavLinks();

  public setup(core: CoreSetup<CustomAppsStartDependencies>) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      euiIconType: 'apps',
      // Its own group, ordered above Analytics. Without a category an app falls
      // outside every group and lands at the bottom whatever its order.
      category: CUSTOM_APPS_CATEGORY,
      order: 100,
      updater$: this.navLinks.updater$,
      mount: async (params: AppMountParameters) => {
        const [coreStart, startDeps] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(
          coreStart,
          startDeps.data,
          () => void this.navLinks.refresh(coreStart.http),
          params
        );
      },
    });
    return {};
  }

  public start(core: CoreStart): CustomAppsPluginStart {
    const refreshNavLinks = () => {
      void this.navLinks.refresh(core.http);
    };
    refreshNavLinks();
    return { refreshNavLinks };
  }

  public stop() {}
}
