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

import { Plugin, CoreSetup } from 'kibana/public';

export class CoreHelpMenuPlugin
  implements Plugin<CoreHelpMenuPluginSetup, CoreHelpMenuPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    core.application.register({
      id: 'core_help_menu',
      title: 'Help Menu Test App',
      async mount(params) {
        const [{ chrome, http }] = await core.getStartServices();

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
        return renderApp('Help Menu Test App', params);
      },
    });

    return {};
  }

  public start() {}
  public stop() {}
}

export type CoreHelpMenuPluginSetup = ReturnType<CoreHelpMenuPlugin['setup']>;
export type CoreHelpMenuPluginStart = ReturnType<CoreHelpMenuPlugin['start']>;
