/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { STREAMS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { registerRoutes } from '@kbn/server-route-repository';
import type { StreamsConfig } from '../common/config';
import { configSchema, exposeToBrowserConfig } from '../common/config';
import {
  STREAMS_API_PRIVILEGES,
  STREAMS_CONSUMER,
  STREAMS_FEATURE_ID,
  STREAMS_TIERED_FEATURES,
  STREAMS_UI_PRIVILEGES,
} from '../common/constants';
import { registerFeatureFlags } from './feature_flags';
import { ContentService } from './lib/content/content_service';
import { registerRules } from './lib/rules/register_rules';
import { AttachmentService } from './lib/streams/attachments/attachment_service';
import { QueryService } from './lib/streams/assets/query/query_service';
import { StreamsService } from './lib/streams/service';
import { EbtTelemetryService, StatsTelemetryService } from './lib/telemetry';
import { streamsRouteRepository } from './routes';
import type { RouteHandlerScopedClients } from './routes/types';
import type {
  StreamsPluginSetupDependencies,
  StreamsPluginStartDependencies,
  StreamsServer,
} from './types';
import { createStreamsGlobalSearchResultProvider } from './lib/streams/create_streams_global_search_result_provider';
import { FeatureService } from './lib/streams/feature/feature_service';
import { ProcessorSuggestionsService } from './lib/streams/ingest_pipelines/processor_suggestions_service';
import { registerStreamsSavedObjects } from './lib/saved_objects/register_saved_objects';
import { TaskService } from './lib/tasks/task_service';
import { SystemService } from './lib/streams/system/system_service';

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
  private ebtTelemetryService = new EbtTelemetryService();
  private statsTelemetryService = new StatsTelemetryService();
  private processorSuggestionsService: ProcessorSuggestionsService;

  constructor(context: PluginInitializerContext<StreamsConfig>) {
    this.isDev = context.env.mode.dev;
    this.config = context.config.get();
    this.logger = context.logger.get();
    this.processorSuggestionsService = new ProcessorSuggestionsService();
  }

  public setup(
    core: CoreSetup<StreamsPluginStartDependencies>,
    plugins: StreamsPluginSetupDependencies
  ): StreamsPluginSetup {
    this.server = {
      config: this.config,
      logger: this.logger,
    } as StreamsServer;

    this.ebtTelemetryService.setup(core.analytics);
    this.statsTelemetryService.setup(
      core,
      this.logger.get('streams-stats-telemetry'),
      plugins.usageCollection
    );

    const alertingFeatures = STREAMS_RULE_TYPE_IDS.map((ruleTypeId) => ({
      ruleTypeId,
      consumers: [STREAMS_CONSUMER],
    }));

    registerRules({ plugins, logger: this.logger.get('rules') });
    registerStreamsSavedObjects(core.savedObjects);

    const attachmentService = new AttachmentService(core, this.logger);
    const streamsService = new StreamsService(core, this.logger, this.isDev);
    const featureService = new FeatureService(core, this.logger);
    const systemService = new SystemService(core, this.logger);
    const contentService = new ContentService(core, this.logger);
    const queryService = new QueryService(core, this.logger);
    const taskService = new TaskService(plugins.taskManager);

    const getScopedClients = async ({
      request,
    }: {
      request: KibanaRequest;
    }): Promise<RouteHandlerScopedClients> => {
      const [
        [coreStart, pluginsStart],
        attachmentClient,
        featureClient,
        systemClient,
        contentClient,
        queryClient,
      ] = await Promise.all([
        core.getStartServices(),
        attachmentService.getClientWithRequest({ request }),
        featureService.getClientWithRequest({ request }),
        systemService.getClientWithRequest({ request }),
        contentService.getClient(),
        queryService.getClientWithRequest({ request }),
      ]);

      const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
        coreStart.savedObjects.getScopedClient(request)
      );

      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
      const soClient = coreStart.savedObjects.getScopedClient(request);
      const inferenceClient = pluginsStart.inference.getClient({ request });
      const licensing = pluginsStart.licensing;
      const fieldsMetadataClient = await pluginsStart.fieldsMetadata.getClient(request);
      const taskClient = await taskService.getClient(
        coreStart,
        pluginsStart.taskManager,
        this.logger
      );

      const streamsClient = await streamsService.getClientWithRequest({
        request,
        attachmentClient,
        queryClient,
        systemClient,
        featureClient,
      });

      return {
        scopedClusterClient,
        soClient,
        attachmentClient,
        streamsClient,
        featureClient,
        systemClient,
        inferenceClient,
        contentClient,
        queryClient,
        fieldsMetadataClient,
        licensing,
        uiSettingsClient,
        taskClient,
      };
    };

    const telemetryClient = this.ebtTelemetryService.getClient();

    taskService.registerTasks({
      getScopedClients,
      logger: this.logger,
      telemetry: telemetryClient,
    });

    plugins.features.registerKibanaFeature({
      id: STREAMS_FEATURE_ID,
      name: i18n.translate('xpack.streams.featureRegistry.streamsFeatureName', {
        defaultMessage: 'Streams',
      }),
      order: 600,
      category: DEFAULT_APP_CATEGORIES.management,
      app: [STREAMS_FEATURE_ID],
      alerting: alertingFeatures,
      privileges: {
        all: {
          app: [STREAMS_FEATURE_ID],
          savedObject: {
            all: [],
            read: [],
          },
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
        features: featureService,
        server: this.server,
        telemetry: telemetryClient,
        processorSuggestions: this.processorSuggestionsService,
        getScopedClients,
      },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });

    registerFeatureFlags(core, this.logger);

    if (plugins.globalSearch) {
      plugins.globalSearch.registerResultProvider(
        createStreamsGlobalSearchResultProvider(this.logger)
      );
    }

    return {};
  }

  public start(core: CoreStart, plugins: StreamsPluginStartDependencies): StreamsPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.actions = plugins.actions;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.taskManager = plugins.taskManager;
    }

    this.processorSuggestionsService.setConsoleStart(plugins.console);

    return {};
  }

  public stop() {}
}
