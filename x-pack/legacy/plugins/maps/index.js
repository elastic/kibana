/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initRoutes } from './server/routes';
import { getEcommerceSavedObjects } from './server/sample_data/ecommerce_saved_objects';
import { getFlightsSavedObjects } from './server/sample_data/flights_saved_objects.js';
import { getWebLogsSavedObjects } from './server/sample_data/web_logs_saved_objects.js';
import mappings from './mappings.json';
import { checkLicense } from './check_license';
import { migrations } from './migrations';
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { initTelemetryCollection } from './server/maps_telemetry';
import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ICON, createMapPath } from './common/constants';
import { getAppTitle } from './common/i18n_getters';
import _ from 'lodash';

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
          defaultMessage: 'Map application',
        }),
        main: 'plugins/maps/index',
        icon: 'plugins/maps/icon.svg',
        euiIconType: APP_ICON,
      },
      injectDefaultVars(server) {
        const serverConfig = server.config();
        const mapConfig = serverConfig.get('map');

        return {
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
          tilemap: _.get(mapConfig, 'tilemap', []),
        };
      },
      embeddableFactories: ['plugins/maps/embeddable/map_embeddable_factory'],
      inspectorViews: ['plugins/maps/inspector/views/register_views'],
      home: ['plugins/maps/register_feature'],
      styleSheetPaths: `${__dirname}/public/index.scss`,
      savedObjectSchemas: {
        'maps-telemetry': {
          isNamespaceAgnostic: true,
        },
      },
      savedObjectsManagement: {
        map: {
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
      initTelemetryCollection(server);

      const xpackMainPlugin = server.plugins.xpack_main;
      let routesInitialized = false;

      xpackMainPlugin.registerFeature({
        id: 'maps',
        name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
          defaultMessage: 'Maps',
        }),
        icon: APP_ICON,
        navLinkId: 'maps',
        app: [APP_ID, 'kibana'],
        catalogue: ['maps'],
        privileges: {
          all: {
            savedObject: {
              all: ['map', 'query'],
              read: ['index-pattern'],
            },
            ui: ['save', 'show', 'saveQuery'],
          },
          read: {
            savedObject: {
              all: [],
              read: ['map', 'index-pattern', 'query'],
            },
            ui: ['show'],
          },
        },
      });

      watchStatusAndLicenseToInitialize(xpackMainPlugin, this, async license => {
        if (license && license.maps && !routesInitialized) {
          routesInitialized = true;
          initRoutes(server, license.uid);
        }
      });

      xpackMainPlugin.info.feature(this.id).registerLicenseCheckResultsGenerator(checkLicense);

      const sampleDataLinkLabel = i18n.translate('xpack.maps.sampleDataLinkLabel', {
        defaultMessage: 'Map',
      });
      server.addSavedObjectsToSampleDataset('ecommerce', getEcommerceSavedObjects());
      server.addAppLinksToSampleDataset('ecommerce', [
        {
          path: createMapPath('2c9c1f60-1909-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: 'gisApp',
        },
      ]);
      server.replacePanelInSampleDatasetDashboard({
        sampleDataId: 'ecommerce',
        dashboardId: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
        oldEmbeddableId: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
        embeddableId: '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
        embeddableType: 'map',
        embeddableConfig: {
          isLayerTOCOpen: false,
        },
      });

      server.addSavedObjectsToSampleDataset('flights', getFlightsSavedObjects());
      server.addAppLinksToSampleDataset('flights', [
        {
          path: createMapPath('5dd88580-1906-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: 'gisApp',
        },
      ]);
      server.replacePanelInSampleDatasetDashboard({
        sampleDataId: 'flights',
        dashboardId: '7adfa750-4c81-11e8-b3d7-01146121b73d',
        oldEmbeddableId: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
        embeddableId: '5dd88580-1906-11e9-919b-ffe5949a18d2',
        embeddableType: 'map',
        embeddableConfig: {
          isLayerTOCOpen: true,
        },
      });

      server.addSavedObjectsToSampleDataset('logs', getWebLogsSavedObjects());
      server.addAppLinksToSampleDataset('logs', [
        {
          path: createMapPath('de71f4f0-1902-11e9-919b-ffe5949a18d2'),
          label: sampleDataLinkLabel,
          icon: 'gisApp',
        },
      ]);
      server.replacePanelInSampleDatasetDashboard({
        sampleDataId: 'logs',
        dashboardId: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
        oldEmbeddableId: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
        embeddableId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
        embeddableType: 'map',
        embeddableConfig: {
          isLayerTOCOpen: false,
        },
      });

      server.injectUiAppVars('maps', async () => {
        return await server.getInjectedUiAppVars('kibana');
      });
    },
  });
}
