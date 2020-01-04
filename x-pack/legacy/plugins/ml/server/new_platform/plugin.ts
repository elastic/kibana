/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { ServerRoute } from 'hapi';
import { KibanaConfig, SavedObjectsLegacyService } from 'src/legacy/server/kbn_server';
import {
  Logger,
  PluginInitializerContext,
  CoreSetup,
  IRouter,
  IScopedClusterClient,
} from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ElasticsearchServiceSetup } from 'src/core/server';
import { CloudSetup } from '../../../../../plugins/cloud/server';
import { XPackMainPlugin } from '../../../xpack_main/server/xpack_main';
import { addLinksToSampleDatasets } from '../lib/sample_data_sets';
import { checkLicense } from '../lib/check_license';
// @ts-ignore: could not find declaration file for module
import { mirrorPluginStatus } from '../../../../server/lib/mirror_plugin_status';
import { FEATURE_ANNOTATIONS_ENABLED } from '../../common/constants/feature_flags';
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
import { makeMlUsageCollector } from '../lib/ml_telemetry';
// @ts-ignore: could not find declaration file for module
import { notificationRoutes } from '../routes/notification_settings';
// @ts-ignore: could not find declaration file for module
import { systemRoutes } from '../routes/system';
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
import { initMlServerLog, LogInitialization } from '../client/log';
import { HomeServerPluginSetup } from '../../../../../../src/plugins/home/server';
// @ts-ignore: could not find declaration file for module
import { elasticsearchJsPlugin } from '../client/elasticsearch_ml';

export const PLUGIN_ID = 'ml';

type CoreHttpSetup = CoreSetup['http'];
export interface MlHttpServiceSetup extends CoreHttpSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}

export interface MlXpackMainPlugin extends XPackMainPlugin {
  status?: any;
}

export interface MlCoreSetup {
  injectUiAppVars: (id: string, callback: () => {}) => any;
  http: MlHttpServiceSetup;
  savedObjects: SavedObjectsLegacyService;
  elasticsearch: ElasticsearchServiceSetup;
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
  usageCollection?: UsageCollectionSetup;
  cloud?: CloudSetup;
  home?: HomeServerPluginSetup;
  // TODO: this is temporary for `mirrorPluginStatus`
  ml: any;
}

export interface RouteInitialization {
  commonRouteConfig: any;
  config?: any;
  elasticsearchPlugin: ElasticsearchPlugin;
  elasticsearchService: ElasticsearchServiceSetup;
  route(route: ServerRoute | ServerRoute[]): void;
  router: IRouter;
  xpackMainPlugin: MlXpackMainPlugin;
  savedObjects?: SavedObjectsLegacyService;
  spacesPlugin: any;
  cloud?: CloudSetup;
}
export interface UsageInitialization {
  elasticsearchPlugin: ElasticsearchPlugin;
  savedObjects: SavedObjectsLegacyService;
}

declare module 'kibana/server' {
  interface RequestHandlerContext {
    ml?: {
      mlClient: IScopedClusterClient;
    };
  }
}

export class Plugin {
  private readonly pluginId: string = PLUGIN_ID;
  private config: any;
  private log: Logger;

  constructor(initializerContext: MlInitializerContext) {
    this.config = initializerContext.legacyConfig;
    this.log = initializerContext.logger.get();
  }

  public setup(core: MlCoreSetup, plugins: PluginsSetup) {
    const xpackMainPlugin: MlXpackMainPlugin = plugins.xpackMain;
    const { http, injectUiAppVars } = core;
    const pluginId = this.pluginId;

    mirrorPluginStatus(xpackMainPlugin, plugins.ml);
    xpackMainPlugin.status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      const mlFeature = xpackMainPlugin.info.feature(pluginId);
      mlFeature.registerLicenseCheckResultsGenerator(checkLicense);

      // Add links to the Kibana sample data sets if ml is enabled
      // and there is a full license (trial or platinum).
      if (mlFeature.isEnabled() === true && plugins.home) {
        const licenseCheckResults = mlFeature.getLicenseCheckResults();
        if (licenseCheckResults.licenseType === LICENSE_TYPE.FULL) {
          addLinksToSampleDatasets({
            addAppLinksToSampleDataset: plugins.home.sampleData.addAppLinksToSampleDataset,
          });
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

    // Can access via new platform router's handler function 'context' parameter - context.ml.mlClient
    const mlClient = core.elasticsearch.createClient('ml', { plugins: [elasticsearchJsPlugin] });
    http.registerRouteHandlerContext('ml', (context, request) => {
      return {
        mlClient: mlClient.asScoped(request),
      };
    });

    const routeInitializationDeps: RouteInitialization = {
      commonRouteConfig,
      route: http.route,
      router: http.createRouter(),
      elasticsearchPlugin: plugins.elasticsearch,
      elasticsearchService: core.elasticsearch,
      xpackMainPlugin: plugins.xpackMain,
      spacesPlugin: plugins.spaces,
    };

    const extendedRouteInitializationDeps: RouteInitialization = {
      ...routeInitializationDeps,
      config: this.config,
      savedObjects: core.savedObjects,
      spacesPlugin: plugins.spaces,
      cloud: plugins.cloud,
    };
    const usageInitializationDeps: UsageInitialization = {
      elasticsearchPlugin: plugins.elasticsearch,
      savedObjects: core.savedObjects,
    };

    const logInitializationDeps: LogInitialization = {
      log: this.log,
    };

    annotationRoutes(routeInitializationDeps);
    jobRoutes(routeInitializationDeps);
    dataFeedRoutes(routeInitializationDeps);
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
    makeMlUsageCollector(plugins.usageCollection, usageInitializationDeps);
  }

  public stop() {}
}
