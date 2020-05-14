/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { getAppTitle } from '../../../plugins/maps/common/i18n_getters';
import { MapPlugin } from './server/plugin';
import { APP_ID, APP_ICON } from '../../../plugins/maps/common/constants';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';

export function maps(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    id: APP_ID,
    configPrefix: 'xpack.maps',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: getAppTitle(),
        description: i18n.translate('xpack.maps.appDescription', {
          defaultMessage: 'Map application',
        }),
        main: 'plugins/maps/legacy',
        icon: 'plugins/maps/icon.svg',
        euiIconType: APP_ICON,
        category: DEFAULT_APP_CATEGORIES.kibana,
        order: 4000,
      },
      injectDefaultVars(server) {
        const serverConfig = server.config();

        return {
          showMapVisualizationTypes: serverConfig.get('xpack.maps.showMapVisualizationTypes'),
          showMapsInspectorAdapter: serverConfig.get('xpack.maps.showMapsInspectorAdapter'),
          enableVectorTiles: serverConfig.get('xpack.maps.enableVectorTiles'),
          preserveDrawingBuffer: serverConfig.get('xpack.maps.preserveDrawingBuffer'),
          kbnPkgVersion: serverConfig.get('pkg.version'),
        };
      },
      styleSheetPaths: `${__dirname}/public/index.scss`,
    },
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        showMapVisualizationTypes: Joi.boolean().default(false),
        showMapsInspectorAdapter: Joi.boolean().default(false), // flag used in functional testing
        preserveDrawingBuffer: Joi.boolean().default(false), // flag used in functional testing
        enableVectorTiles: Joi.boolean().default(false), // flag used to enable/disable vector-tiles
      }).default();
    },

    init(server) {
      const __LEGACY = {
        injectUiAppVars: server.injectUiAppVars,
        getInjectedUiAppVars: server.getInjectedUiAppVars,
      };

      const mapPlugin = new MapPlugin();
      mapPlugin.setup(__LEGACY);
    },
  });
}
