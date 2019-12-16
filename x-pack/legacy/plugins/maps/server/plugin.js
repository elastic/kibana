/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ICON, createMapPath, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { initRoutes } from './routes';
import { getEcommerceSavedObjects } from './sample_data/ecommerce_saved_objects';
import { getFlightsSavedObjects } from './sample_data/flights_saved_objects.js';
import { getWebLogsSavedObjects } from './sample_data/web_logs_saved_objects.js';
import { checkLicense } from '../check_license';
import { watchStatusAndLicenseToInitialize } from '../../../server/lib/watch_status_and_license_to_initialize';
import { registerMapsUsageCollector } from './maps_telemetry/collectors/register';

export class MapPlugin {
  setup(core, plugins, __LEGACY) {
    const { featuresPlugin, usageCollection } = plugins;
    let routesInitialized = false;

    featuresPlugin.registerFeature({
      id: APP_ID,
      name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
        defaultMessage: 'Maps',
      }),
      icon: APP_ICON,
      navLinkId: APP_ID,
      app: [APP_ID, 'kibana'],
      catalogue: [APP_ID],
      privileges: {
        all: {
          savedObject: {
            all: [MAP_SAVED_OBJECT_TYPE, 'query'],
            read: ['index-pattern'],
          },
          ui: ['save', 'show', 'saveQuery'],
        },
        read: {
          savedObject: {
            all: [],
            read: [MAP_SAVED_OBJECT_TYPE, 'index-pattern', 'query'],
          },
          ui: ['show'],
        },
      },
    });

    watchStatusAndLicenseToInitialize(
      __LEGACY.plugins.xpackMainPlugin,
      __LEGACY.pluginRef,
      async license => {
        if (license && license.maps && !routesInitialized) {
          routesInitialized = true;
          initRoutes(__LEGACY, license.uid);
        }
      }
    );

    __LEGACY.plugins.xpackMainPlugin.info
      .feature(APP_ID)
      .registerLicenseCheckResultsGenerator(checkLicense);

    // Init telemetry
    const { savedObjectsClient } = __LEGACY.savedObjects;
    registerMapsUsageCollector(usageCollection, savedObjectsClient, __LEGACY.config);

    const sampleDataLinkLabel = i18n.translate('xpack.maps.sampleDataLinkLabel', {
      defaultMessage: 'Map',
    });
    __LEGACY.addSavedObjectsToSampleDataset('ecommerce', getEcommerceSavedObjects());

    __LEGACY.addAppLinksToSampleDataset('ecommerce', [
      {
        path: createMapPath('2c9c1f60-1909-11e9-919b-ffe5949a18d2'),
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);

    __LEGACY.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'ecommerce',
      dashboardId: '722b74f0-b882-11e8-a6d9-e546fe2bba5f',
      oldEmbeddableId: '9c6f83f0-bb4d-11e8-9c84-77068524bcab',
      embeddableId: '2c9c1f60-1909-11e9-919b-ffe5949a18d2',
      embeddableType: 'map',
      embeddableConfig: {
        isLayerTOCOpen: false,
      },
    });

    __LEGACY.addSavedObjectsToSampleDataset('flights', getFlightsSavedObjects());

    __LEGACY.addAppLinksToSampleDataset('flights', [
      {
        path: createMapPath('5dd88580-1906-11e9-919b-ffe5949a18d2'),
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);

    __LEGACY.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'flights',
      dashboardId: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      oldEmbeddableId: '334084f0-52fd-11e8-a160-89cc2ad9e8e2',
      embeddableId: '5dd88580-1906-11e9-919b-ffe5949a18d2',
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: true,
      },
    });

    __LEGACY.addSavedObjectsToSampleDataset('logs', getWebLogsSavedObjects());
    __LEGACY.addAppLinksToSampleDataset('logs', [
      {
        path: createMapPath('de71f4f0-1902-11e9-919b-ffe5949a18d2'),
        label: sampleDataLinkLabel,
        icon: APP_ICON,
      },
    ]);
    __LEGACY.replacePanelInSampleDatasetDashboard({
      sampleDataId: 'logs',
      dashboardId: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
      oldEmbeddableId: '06cf9c40-9ee8-11e7-8711-e7a007dcef99',
      embeddableId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2',
      embeddableType: MAP_SAVED_OBJECT_TYPE,
      embeddableConfig: {
        isLayerTOCOpen: false,
      },
    });

    __LEGACY.injectUiAppVars(APP_ID, async () => {
      return await __LEGACY.getInjectedUiAppVars('kibana');
    });

    return {
      getMapConfig() {
        return __LEGACY.mapConfig();
      },
    };
  }
}
