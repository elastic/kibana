/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup } from '@kbn/core/public';

export class CoreHelpMenuPlugin
  implements Plugin<CoreHelpMenuPluginSetup, CoreHelpMenuPluginStart>
{
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'core_help_menu',
      title: 'Help Menu Test App',
      async mount(params) {
        const [{ chrome, http, ...startServices }] = await core.getStartServices();

        chrome.setHelpExtension({
          appName: 'HelpMenuTestApp',
          links: [
            {
              linkType: 'custom',
              href: http.basePath.prepend('/app/management'),
              content: 'Go to management',
              'data-test-subj': 'coreHelpMenuInternalLinkTest',
            },
          ],
        });

        const { renderApp } = await import('./application');
        return renderApp('Help Menu Test App', params, startServices);
      },
    });

    return {};
  }

  public start() {}
  public stop() {}
}

export type CoreHelpMenuPluginSetup = ReturnType<CoreHelpMenuPlugin['setup']>;
export type CoreHelpMenuPluginStart = ReturnType<CoreHelpMenuPlugin['start']>;
