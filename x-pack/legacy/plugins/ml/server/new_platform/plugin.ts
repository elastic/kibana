/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { ServerRoute } from '@hapi/hapi';
import { KibanaConfig, SavedObjectsService } from 'src/legacy/server/kbn_server';
import { HttpServiceSetup, Logger, PluginInitializerContext } from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { addLinksToSampleDatasets } from '../lib/sample_data_sets';
// @ts-ignore: could not find declaration file for module
import { checkLicense } from '../lib/check_license';
// @ts-ignore: could not find declaration file for module
import { mirrorPluginStatus } from '../../../../server/lib/mirror_plugin_status';
// @ts-ignore: could not find declaration file for module
import { FEATURE_ANNOTATIONS_ENABLED } from '../../common/constants/feature_flags';
// @ts-ignore: could not find declaration file for module
import { LICENSE_TYPE } from '../../common/constants/license';
// @ts-ignore: could not find declaration file for module
import { annotationRoutes } from '../routes/annotations';
// @ts-ignore: could not find declaration file for module
import { jobRoutes } from '../routes/anomaly_detectors';
// @ts-ignore: could not find declaration file for module
import { dataFeedRoutes } from '../routes/datafeeds';
// @ts-ignore: could not find declaration file for module
import { indicesRoutes } from '../routes/indices';
// @ts-ignore: could not find declaration file for module
import { jobValidationRoutes } from '../routes/job_validation';
// @ts-ignore: could not find declaration file for module
import { makeMlUsageCollector } from '../lib/ml_telemetry';
// @ts-ignore: could not find declaration file for module
import { notificationRoutes } from '../routes/notification_settings';
// @ts-ignore: could not find declaration file for module
import { systemRoutes } from '../routes/system';
// @ts-ignore: could not find declaration file for module
import { dataFrameRoutes } from '../routes/data_frame';
// @ts-ignore: could not find declaration file for module
import { dataFrameAnalyticsRoutes } from '../routes/data_frame_analytics';
// @ts-ignore: could not find declaration file for module
import { dataRecognizer } from '../routes/modules';
// @ts-ignore: could not find declaration file for module
import { dataVisualizerRoutes } from '../routes/data_visualizer';
// @ts-ignore: could not find declaration file for module
import { calendars } from '../routes/calendars';
// @ts-ignore: could not find declaration file for module
import { fieldsService } from '../routes/fields_service';
// @ts-ignore: could not find declaration file for module
import { filtersRoutes } from '../routes/filters';
// @ts-ignore: could not find declaration file for module
import { resultsServiceRoutes } from '../routes/results_service';
// @ts-ignore: could not find declaration file for module
import { jobServiceRoutes } from '../routes/job_service';
// @ts-ignore: could not find declaration file for module
import { jobAuditMessagesRoutes } from '../routes/job_audit_messages';
// @ts-ignore: could not find declaration file for module
import { fileDataVisualizerRoutes } from '../routes/file_data_visualizer';
// @ts-ignore: could not find declaration file for module
import { initMlServerLog, LogInitialization } from '../client/log';

export interface MlHttpServiceSetup extends HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}

export interface MlXpackMainPlugin extends XPackMainPlugin {
  status?: any;
}

export interface MlCoreSetup {
  addAppLinksToSampleDataset: () => any;
  injectUiAppVars: (id: string, callback: () => {}) => any;
  http: MlHttpServiceSetup;
  savedObjects: SavedObjectsService;
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: (collector: any) => void;
    };
  };
}
export interface MlInitializerContext extends PluginInitializerContext {
  legacyConfig: KibanaConfig;
  log: Logger;
}
export interface PluginsSetup {
  elasticsearch: ElasticsearchPlugin;
  xpackMain: MlXpackMainPlugin;
  security: any;
  spaces: any;
  // TODO: this is temporary for `mirrorPluginStatus`
  ml: any;
}
export interface RouteInitialization {
  commonRouteConfig: any;
  config?: any;
  elasticsearchPlugin: ElasticsearchPlugin;
  route(route: ServerRoute | ServerRoute[]): void;
  xpackMainPlugin?: MlXpackMainPlugin;
  savedObjects?: SavedObjectsService;
  spacesPlugin: any;
}
export interface UsageInitialization {
  elasticsearchPlugin: ElasticsearchPlugin;
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: (collector: any) => void;
    };
  };
  savedObjects: SavedObjectsService;
}

export class Plugin {
  private readonly pluginId: string = 'ml';
  private config: any;
  private log: Logger;

  constructor(initializerContext: MlInitializerContext) {
    this.config = initializerContext.legacyConfig;
    this.log = initializerContext.logger.get();
  }

  public setup(core: MlCoreSetup, plugins: PluginsSetup) {
    const xpackMainPlugin: MlXpackMainPlugin = plugins.xpackMain;
    const { addAppLinksToSampleDataset, http, injectUiAppVars } = core;
    const pluginId = this.pluginId;

    mirrorPluginStatus(xpackMainPlugin, plugins.ml);
    xpackMainPlugin.status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      const mlFeature = xpackMainPlugin.info.feature(pluginId);
      mlFeature.registerLicenseCheckResultsGenerator(checkLicense);

      // Add links to the Kibana sample data sets if ml is enabled
      // and there is a full license (trial or platinum).
      if (mlFeature.isEnabled() === true) {
        const licenseCheckResults = mlFeature.getLicenseCheckResults();
        if (licenseCheckResults.licenseType === LICENSE_TYPE.FULL) {
          addLinksToSampleDatasets({ addAppLinksToSampleDataset });
        }
      }
    });

    xpackMainPlugin.registerFeature({
      id: 'ml',
      name: i18n.translate('xpack.ml.featureRegistry.mlFeatureName', {
        defaultMessage: 'Machine Learning',
      }),
      icon: 'machineLearningApp',
      navLinkId: 'ml',
      app: ['ml', 'kibana'],
      catalogue: ['ml'],
      privileges: {},
      reserved: {
        privilege: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        description: i18n.translate('xpack.ml.feature.reserved.description', {
          defaultMessage:
            'To grant users access, you should also assign either the machine_learning_user or machine_learning_admin role.',
        }),
      },
    });

    // Add server routes and initialize the plugin here
    const commonRouteConfig = {
      pre: [
        function forbidApiAccess() {
          const licenseCheckResults = xpackMainPlugin.info
            .feature(pluginId)
            .getLicenseCheckResults();
          if (licenseCheckResults.isAvailable) {
            return null;
          } else {
            throw Boom.forbidden(licenseCheckResults.message);
          }
        },
      ],
    };

    injectUiAppVars('ml', () => {
      return {
        kbnIndex: this.config.get('kibana.index'),
        mlAnnotationsEnabled: FEATURE_ANNOTATIONS_ENABLED,
      };
    });

    const routeInitializationDeps: RouteInitialization = {
      commonRouteConfig,
      route: http.route,
      elasticsearchPlugin: plugins.elasticsearch,
      spacesPlugin: plugins.spaces,
    };

    const extendedRouteInitializationDeps: RouteInitialization = {
      ...routeInitializationDeps,
      config: this.config,
      xpackMainPlugin: plugins.xpackMain,
      savedObjects: core.savedObjects,
      spacesPlugin: plugins.spaces,
    };

    const usageInitializationDeps: UsageInitialization = {
      elasticsearchPlugin: plugins.elasticsearch,
      usage: core.usage,
      savedObjects: core.savedObjects,
    };

    const logInitializationDeps: LogInitialization = {
      log: this.log,
    };

    annotationRoutes(routeInitializationDeps);
    jobRoutes(routeInitializationDeps);
    dataFeedRoutes(routeInitializationDeps);
    dataFrameRoutes(routeInitializationDeps);
    dataFrameAnalyticsRoutes(routeInitializationDeps);
    indicesRoutes(routeInitializationDeps);
    jobValidationRoutes(extendedRouteInitializationDeps);
    notificationRoutes(routeInitializationDeps);
    systemRoutes(extendedRouteInitializationDeps);
    dataRecognizer(routeInitializationDeps);
    dataVisualizerRoutes(routeInitializationDeps);
    calendars(routeInitializationDeps);
    fieldsService(routeInitializationDeps);
    filtersRoutes(routeInitializationDeps);
    resultsServiceRoutes(routeInitializationDeps);
    jobServiceRoutes(routeInitializationDeps);
    jobAuditMessagesRoutes(routeInitializationDeps);
    fileDataVisualizerRoutes(extendedRouteInitializationDeps);

    initMlServerLog(logInitializationDeps);
    makeMlUsageCollector(usageInitializationDeps);
  }

  public stop() {}
}
