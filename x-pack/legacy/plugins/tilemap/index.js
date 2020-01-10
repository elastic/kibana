/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { inspectSettings } from './server/lib/inspect_settings';
import { resolve } from 'path';

export const tilemap = kibana => {
  return new kibana.Plugin({
    id: 'tilemap',
    configPrefix: 'xpack.tilemap',
    require: ['xpack_main', 'kbn_vislib_vis_types'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      visTypeEnhancers: ['plugins/tilemap/vis_type_enhancers/update_tilemap_settings'],
    },
    init: function(server) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;
      mirrorPluginStatus(xpackMainPlugin, thisPlugin);
      xpackMainPlugin.status.once('green', () => {
        xpackMainPlugin.info
          .feature(thisPlugin.id)
          .registerLicenseCheckResultsGenerator(inspectSettings);
      });
    },
  });
};
