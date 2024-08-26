/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';

export class EuiProviderDevWarningPlugin
  implements Plugin<EuiProviderDevWarningPluginSetup, EuiProviderDevWarningPluginStart>
{
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'euiProviderDevWarning',
      title: 'EUI Provider Dev Warning',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        coreStart.chrome.docTitle.change('EuiProvider test');
        return renderApp(coreStart, params);
      },
    });

    // Return methods that should be available to other plugins
    return {};
  }

  public start() {}
  public stop() {}
}

export type EuiProviderDevWarningPluginSetup = ReturnType<EuiProviderDevWarningPlugin['setup']>;
export type EuiProviderDevWarningPluginStart = ReturnType<EuiProviderDevWarningPlugin['start']>;
