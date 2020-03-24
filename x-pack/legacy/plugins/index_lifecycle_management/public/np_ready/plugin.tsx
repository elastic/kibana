/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { PLUGIN } from '../../common/constants';
import { LegacySetup } from './application';

interface PluginsSetup {
  __LEGACY: LegacySetup;
}

export class IndexLifecycleManagementPlugin implements Plugin<void, void, any, any> {
  setup(core: CoreSetup, plugins: PluginsSetup) {
    // Extract individual core dependencies.
    const {
      application,
      notifications: { toasts },
      fatalErrors,
      http,
    } = core;

    // The Plugin interface won't allow us to pass __LEGACY as a third argument, so we'll just
    // sneak it inside of the plugins parameter for now.
    const { __LEGACY } = plugins;

    application.register({
      id: PLUGIN.ID,
      title: PLUGIN.TITLE,
      async mount(config, mountPoint) {
        const {
          core: {
            docLinks,
            i18n: { Context: I18nContext },
          },
        } = config;

        const { element } = mountPoint;
        const { renderApp } = await import('./application');

        // Inject all dependencies into our app.
        return renderApp({
          legacy: { ...__LEGACY },
          I18nContext,
          http,
          toasts,
          fatalErrors,
          docLinks,
          element,
        });
      },
    });
  }
  start(core: CoreStart, plugins: any) {}
  stop() {}
}
