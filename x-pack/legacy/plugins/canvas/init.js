/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routes } from './server/routes';
import { registerCanvasUsageCollector } from './server/usage';
import { functions } from './canvas_plugin_src/functions/server';
import { loadSampleData } from './server/sample_data';

export default async function(server /*options*/) {
  const { serverFunctions } = server.plugins.interpreter.register({
    serverFunctions: functions,
  });

  server.injectUiAppVars('canvas', async () => {
    const config = server.config();
    const basePath = config.get('server.basePath');
    const reportingBrowserType = (() => {
      const configKey = 'xpack.reporting.capture.browser.type';
      if (!config.has(configKey)) {
        return null;
      }
      return config.get(configKey);
    })();
    const kibanaVars = await server.getInjectedUiAppVars('kibana');

    return {
      ...kibanaVars,
      kbnIndex: config.get('kibana.index'),
      serverFunctions: serverFunctions.toArray(),
      basePath,
      reportingBrowserType,
    };
  });

  server.plugins.xpack_main.registerFeature({
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

  registerCanvasUsageCollector(server);
  loadSampleData(server);
  routes(server);
}
