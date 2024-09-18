/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_APP_VISIBILITY } from '@kbn/core-application-browser-internal';
import { Plugin, CoreSetup } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';

export class CorePluginDeepLinksPlugin
  implements Plugin<CorePluginDeepLinksPluginSetup, CorePluginDeepLinksPluginStart>
{
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'deeplinks',
      title: 'Deep Links',
      appRoute: '/app/dl',
      defaultPath: '/home',
      category: DEFAULT_APP_CATEGORIES.security,
      visibleIn: [],
      deepLinks: [
        {
          id: 'home',
          title: 'DL Home',
          path: '/home',
          visibleIn: DEFAULT_APP_VISIBILITY,
        },
        {
          id: 'pageA',
          title: 'DL page A',
          path: '/page-a',
          visibleIn: DEFAULT_APP_VISIBILITY,
        },
        {
          id: 'sectionOne',
          title: 'DL Section One',
          deepLinks: [
            {
              id: 'pageB',
              title: 'DL page B',
              path: '/page-b',
              visibleIn: DEFAULT_APP_VISIBILITY,
            },
          ],
        },
        {
          id: 'pageC',
          title: 'DL page C',
          path: '/page-c',
          // navLinkStatus hidden by default
        },
      ],
      async mount(params) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    return {
      getGreeting() {
        return 'Hello from Deep Link Plugin!';
      },
    };
  }

  public start() {}
  public stop() {}
}

export type CorePluginDeepLinksPluginSetup = ReturnType<CorePluginDeepLinksPlugin['setup']>;
export type CorePluginDeepLinksPluginStart = ReturnType<CorePluginDeepLinksPlugin['start']>;
