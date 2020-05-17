/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../../src/core/public';
import {
  BackgroundSessionExamplePluginSetup,
  BackgroundSessionExamplePluginStart,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';

export class BackgroundSessionExamplePlugin
  implements Plugin<BackgroundSessionExamplePluginSetup, BackgroundSessionExamplePluginStart> {
  public setup(core: CoreSetup): BackgroundSessionExamplePluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'backgroundSessionExample',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('backgroundSessionExample.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): BackgroundSessionExamplePluginStart {
    return {};
  }

  public stop() {}
}
