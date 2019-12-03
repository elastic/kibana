/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';

import { BootLegacyDependencies } from './types';

interface LegacyPlugins {
  __LEGACY: BootLegacyDependencies;
}

export class WatcherUIPlugin implements Plugin<void, void, LegacyPlugins, any> {
  /* TODO: Remove this in future. We need this at mount (setup) but it's only available on start plugins. */
  euiUtils: any = null;

  setup({ application, notifications, http, uiSettings }: CoreSetup, { __LEGACY }: LegacyPlugins) {
    application.register({
      id: 'watcher',
      title: 'Watcher',
      mount: async (
        {
          core: {
            docLinks,
            chrome,
            // Will be passed through in future, remove @ts-ignore when shim is removed or types are updated
            // @ts-ignore
            savedObjects,
          },
        },
        { element }
      ) => {
        const euiUtils = this.euiUtils!;
        const { boot } = await import('./application/boot');
        return boot({
          element,
          toasts: notifications.toasts,
          http,
          uiSettings,
          docLinks,
          chrome,
          euiUtils,
          savedObjects,
          legacy: {
            ...__LEGACY,
          },
        });
      },
    });
  }

  start(core: CoreStart, { eui_utils }: any) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    this.euiUtils = eui_utils;
  }

  stop() {}
}
