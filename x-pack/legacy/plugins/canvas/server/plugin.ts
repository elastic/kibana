/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginsSetup } from './shim';
import { routes } from './routes';
import { functions } from '../canvas_plugin_src/functions/server';
import { loadSampleData } from './sample_data';

export class Plugin {
  public setup(core: CoreSetup, plugins: PluginsSetup) {
    routes(core);

    const { serverFunctions } = plugins.interpreter.register({ serverFunctions: functions });

    core.injectUiAppVars('canvas', async () => {
      const config = core.getServerConfig();
      const basePath = config.get('server.basePath');
      const reportingBrowserType = (() => {
        const configKey = 'xpack.reporting.capture.browser.type';
        if (!config.has(configKey)) {
          return null;
        }
        return config.get(configKey);
      })();

      return {
        ...plugins.kibana.injectedUiAppVars,
        kbnIndex: config.get('kibana.index'),
        serverFunctions: serverFunctions.toArray(),
        basePath,
        reportingBrowserType,
      };
    });

    plugins.features.registerFeature({
      id: 'canvas',
      name: 'Canvas',
      icon: 'canvasApp',
      navLinkId: 'canvas',
      app: ['canvas', 'kibana'],
      catalogue: ['canvas'],
      privileges: {
        all: {
          savedObject: {
            all: ['canvas-workpad', 'canvas-element'],
            read: ['index-pattern'],
          },
          ui: ['save', 'show'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['index-pattern', 'canvas-workpad', 'canvas-element'],
          },
          ui: ['show'],
        },
      },
    });

    loadSampleData(
      plugins.home.sampleData.addSavedObjectsToSampleDataset,
      plugins.home.sampleData.addAppLinksToSampleDataset
    );
  }
}
