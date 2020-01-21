/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import { ChartsPluginSetup } from 'src/plugins/charts/public';

import { LegacyDependencies } from './types';

interface WatcherUISetupPlugins {
  __LEGACY: LegacyDependencies;
  charts: ChartsPluginSetup;
}

export class WatcherUIPlugin implements Plugin<void, void, WatcherUISetupPlugins> {
  setup(
    { application, notifications, http, uiSettings }: CoreSetup,
    { __LEGACY, charts: { theme } }: WatcherUISetupPlugins
  ) {
    application.register({
      id: 'watcher',
      title: 'Watcher',
      mount: async (
        {
          core: {
            docLinks,
            chrome,
            // Waiting for types to be updated.
            // @ts-ignore
            savedObjects,
            i18n: { Context: I18nContext },
          },
        },
        { element }
      ) => {
        const { boot } = await import('./application/boot');
        return boot({
          element,
          toasts: notifications.toasts,
          http,
          uiSettings,
          docLinks,
          chrome,
          theme,
          savedObjects: savedObjects.client,
          I18nContext,
          legacy: {
            ...__LEGACY,
          },
        });
      },
    });
  }

  start(core: CoreStart) {}
}
