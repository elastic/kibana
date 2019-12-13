/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';

export function backgroundSearchViewer(kibana: any) {
  return new kibana.Plugin({
    id: 'background_search_viewer',
    require: ['kibana'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Background searches',
        order: 1,
        main: 'plugins/background_search_viewer/legacy',
      },
    },
    init(server: Legacy.Server) {
      server.injectUiAppVars('background_search_viewer', async () =>
        server.getInjectedUiAppVars('kibana')
      );
    },
  });
}
