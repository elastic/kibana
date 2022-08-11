/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES, AppNavLinkStatus } from '@kbn/core/public';

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
      navLinkStatus: AppNavLinkStatus.hidden,
      deepLinks: [
        {
          id: 'home',
          title: 'DL Home',
          path: '/home',
          navLinkStatus: AppNavLinkStatus.visible,
        },
        {
          id: 'pageA',
          title: 'DL Page A',
          path: '/page-a',
          navLinkStatus: AppNavLinkStatus.visible,
        },
        {
          id: 'sectionOne',
          title: 'DL Section One',
          deepLinks: [
            {
              id: 'pageB',
              title: 'DL Page B',
              path: '/page-b',
              navLinkStatus: AppNavLinkStatus.visible,
            },
          ],
        },
        {
          id: 'pageC',
          title: 'DL Page C',
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
