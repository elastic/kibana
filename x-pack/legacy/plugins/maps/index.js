/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import mappings from './mappings.json';
import { migrations } from './migrations';
import { getAppTitle } from './common/i18n_getters';
import _ from 'lodash';
import { MapPlugin } from './server/plugin';
import { APP_ID, APP_ICON, createMapPath, MAP_SAVED_OBJECT_TYPE } from './common/constants';

export function maps(kibana) {

  return new kibana.Plugin({
    // task_manager could be required, but is only used for telemetry
    require: ['kibana', 'elasticsearch', 'xpack_main', 'tile_map'],
    id: APP_ID,
    configPrefix: 'xpack.maps',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: getAppTitle(),
        description: i18n.translate('xpack.maps.appDescription', {
          defaultMessage: 'Map application'
        }),
        main: 'plugins/maps/legacy',
        icon: 'plugins/maps/icon.svg',
        euiIconType: APP_ICON,
      },
      injectDefaultVars(server) {
        const serverConfig = server.config();
        const mapConfig = serverConfig.get('map');

        return {
          showMapVisualizationTypes: serverConfig.get('xpack.maps.showMapVisualizationTypes'),
          showMapsInspectorAdapter: serverConfig.get('xpack.maps.showMapsInspectorAdapter'),
          preserveDrawingBuffer: serverConfig.get('xpack.maps.preserveDrawingBuffer'),
          isEmsEnabled: mapConfig.includeElasticMapsService,
          emsFontLibraryUrl: mapConfig.emsFontLibraryUrl,
          emsTileLayerId: mapConfig.emsTileLayerId,
          proxyElasticMapsServiceInMaps: mapConfig.proxyElasticMapsServiceInMaps,
          emsManifestServiceUrl: mapConfig.manifestServiceUrl,
          emsLandingPageUrl: mapConfig.emsLandingPageUrl,
          kbnPkgVersion: serverConfig.get('pkg.version'),
          regionmapLayers: _.get(mapConfig, 'regionmap.layers', []),
          tilemap: _.get(mapConfig, 'tilemap', [])
        };
      },
      embeddableFactories: [
        'plugins/maps/embeddable/map_embeddable_factory'
      ],
      inspectorViews: [
        'plugins/maps/inspector/views/register_views',
      ],
      home: ['plugins/maps/register_feature'],
      styleSheetPaths: `${__dirname}/public/index.scss`,
      savedObjectSchemas: {
        'maps-telemetry': {
          isNamespaceAgnostic: true
        }
      },
      savedObjectsManagement: {
        [MAP_SAVED_OBJECT_TYPE]: {
          icon: APP_ICON,
          defaultSearchField: 'title',
          isImportableAndExportable: true,
          getTitle(obj) {
            return obj.attributes.title;
          },
          getInAppUrl(obj) {
            return {
              path: createMapPath(obj.id),
              uiCapabilitiesPath: 'maps.show',
            };
          },
        },
      },
      mappings,
      migrations,
      visTypes: ['plugins/maps/register_vis_type_alias'],
    },
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        showMapVisualizationTypes: Joi.boolean().default(false),
        showMapsInspectorAdapter: Joi.boolean().default(false), // flag used in functional testing
        preserveDrawingBuffer: Joi.boolean().default(false), // flag used in functional testing
      }).default();
    },

    init(server) {
      const mapsEnabled = server.config().get('xpack.maps.enabled');
      if (!mapsEnabled) {
        server.log(['info', 'maps'], 'Maps app disabled by configuration');
        return;
      }

      const coreSetup = server.newPlatform.setup.core;
      const newPlatformPlugins = server.newPlatform.setup.plugins;
      const pluginsSetup = {
        featuresPlugin: newPlatformPlugins.features,
        licensing: newPlatformPlugins.licensing,
        usageCollection: newPlatformPlugins.usageCollection
      };

      // legacy dependencies
      const __LEGACY = {
        pluginRef: this,
        config: server.config,
        mapConfig() { return server.config().get('map'); },
        route: server.route.bind(server),
        plugins: {
          elasticsearch: server.plugins.elasticsearch,
          xpackMainPlugin: server.plugins.xpack_main
        },
        savedObjects: {
          savedObjectsClient: (() => {
            const callCluster = server.plugins.elasticsearch.getCluster('admin')
              .callWithInternalUser;
            const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
            const internalRepository = getSavedObjectsRepository(callCluster);
            return new SavedObjectsClient(internalRepository);
          })(),
        },
        addSavedObjectsToSampleDataset: server.addSavedObjectsToSampleDataset,
        addAppLinksToSampleDataset: server.addAppLinksToSampleDataset,
        replacePanelInSampleDatasetDashboard: server.replacePanelInSampleDatasetDashboard,
        injectUiAppVars: server.injectUiAppVars,
        getInjectedUiAppVars: server.getInjectedUiAppVars
      };

      const mapPluginSetup = new MapPlugin().setup(coreSetup, pluginsSetup, __LEGACY);
      server.expose('getMapConfig', mapPluginSetup.getMapConfig);
    }
  });
}
