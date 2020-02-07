/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginsSetup } from './shim';
import { functions } from '../canvas_plugin_src/functions/server';
import { loadSampleData } from './sample_data';

export class Plugin {
  public setup(core: CoreSetup, plugins: PluginsSetup) {
    plugins.interpreter.register({ serverFunctions: functions });

    core.injectUiAppVars('canvas', async () => {
      return {
        ...plugins.kibana.injectedUiAppVars,
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
