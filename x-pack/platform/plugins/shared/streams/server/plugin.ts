/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  KibanaRequest,
  Logger,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { STREAMS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { registerRoutes } from '@kbn/server-route-repository';
import { StreamsConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import {
  STREAMS_API_PRIVILEGES,
  STREAMS_CONSUMER,
  STREAMS_FEATURE_ID,
  STREAMS_TIERED_FEATURES,
  STREAMS_UI_PRIVILEGES,
} from '../common/constants';
import { ContentService } from './lib/content/content_service';
import { registerRules } from './lib/rules/register_rules';
import { AssetService } from './lib/streams/assets/asset_service';
import { QueryService } from './lib/streams/assets/query/query_service';
import { StreamsService } from './lib/streams/service';
import { StreamsTelemetryService } from './lib/telemetry/service';
import { streamsRouteRepository } from './routes';
import { RouteHandlerScopedClients } from './routes/types';
import {
  StreamsPluginSetupDependencies,
  StreamsPluginStartDependencies,
  StreamsServer,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginStart {}

export const config: PluginConfigDescriptor<StreamsConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class StreamsPlugin
  implements
    Plugin<
      StreamsPluginSetup,
      StreamsPluginStart,
      StreamsPluginSetupDependencies,
      StreamsPluginStartDependencies
    >
{
  public config: StreamsConfig;
  public logger: Logger;
  public server?: StreamsServer;
  private isDev: boolean;
  private telemetryService = new StreamsTelemetryService();

  constructor(context: PluginInitializerContext<StreamsConfig>) {
    this.isDev = context.env.mode.dev;
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup<StreamsPluginStartDependencies>,
    plugins: StreamsPluginSetupDependencies
  ): StreamsPluginSetup {
    this.server = {
      config: this.config,
      logger: this.logger,
    } as StreamsServer;

    this.telemetryService.setup(core.analytics);

    const alertingFeatures = STREAMS_RULE_TYPE_IDS.map((ruleTypeId) => ({
      ruleTypeId,
      consumers: [STREAMS_CONSUMER],
    }));

    registerRules({ plugins, logger: this.logger.get('rules') });

    const assetService = new AssetService(core, this.logger);
    const streamsService = new StreamsService(core, this.logger, this.isDev);
    const contentService = new ContentService(core, this.logger);
    const queryService = new QueryService(core, this.logger);

    plugins.features.registerKibanaFeature({
      id: STREAMS_FEATURE_ID,
      name: i18n.translate('xpack.streams.featureRegistry.streamsFeatureName', {
        defaultMessage: 'Streams',
      }),
      order: 600,
      category: DEFAULT_APP_CATEGORIES.observability,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: [STREAMS_FEATURE_ID],
      privilegesTooltip: i18n.translate('xpack.streams.featureRegistry.privilegesTooltip', {
        defaultMessage: 'All Spaces is required for Streams access.',
      }),
      alerting: alertingFeatures,
      privileges: {
        all: {
          app: [STREAMS_FEATURE_ID],
          savedObject: {
            all: [],
            read: [],
          },
          requireAllSpaces: true,
          alerting: {
            rule: {
              all: alertingFeatures,
            },
            alert: {
              all: alertingFeatures,
            },
          },
          api: [STREAMS_API_PRIVILEGES.read, STREAMS_API_PRIVILEGES.manage],
          ui: [STREAMS_UI_PRIVILEGES.show, STREAMS_UI_PRIVILEGES.manage],
        },
        read: {
          app: [STREAMS_FEATURE_ID],
          savedObject: {
            all: [],
            read: [],
          },
          requireAllSpaces: true,
          alerting: {
            rule: {
              read: alertingFeatures,
            },
            alert: {
              read: alertingFeatures,
            },
          },
          api: [STREAMS_API_PRIVILEGES.read],
          ui: [STREAMS_UI_PRIVILEGES.show],
        },
      },
    });

    core.pricing.registerProductFeatures(STREAMS_TIERED_FEATURES);

    registerRoutes({
      repository: streamsRouteRepository,
      dependencies: {
        assets: assetService,
        server: this.server,
        telemetry: this.telemetryService.getClient(),
        getScopedClients: async ({
          request,
        }: {
          request: KibanaRequest;
        }): Promise<RouteHandlerScopedClients> => {
          const [[coreStart, pluginsStart], assetClient, contentClient] = await Promise.all([
            core.getStartServices(),
            assetService.getClientWithRequest({ request }),
            contentService.getClient(),
          ]);

          const queryClient = await queryService.getClientWithRequest({
            request,
            assetClient,
          });

          const streamsClient = await streamsService.getClientWithRequest({
            request,
            assetClient,
            queryClient,
          });

          const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
          const soClient = coreStart.savedObjects.getScopedClient(request);
          const inferenceClient = pluginsStart.inference.getClient({ request });
          const licensing = pluginsStart.licensing;

          return {
            scopedClusterClient,
            soClient,
            assetClient,
            streamsClient,
            inferenceClient,
            contentClient,
            queryClient,
            licensing,
          };
        },
      },
      core,
      logger: this.logger,
    });

    return {};
  }

  public start(core: CoreStart, plugins: StreamsPluginStartDependencies): StreamsPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.taskManager = plugins.taskManager;
    }

    return {};
  }

  public stop() {}
}
