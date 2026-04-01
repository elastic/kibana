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
import { OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS } from '@kbn/management-settings-ids';
import { STREAMS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { registerRoutes } from '@kbn/server-route-repository';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { LOGS_ECS_STREAM_NAME, ROOT_STREAM_NAMES, Streams } from '@kbn/streams-schema';
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
import { registerRules } from './lib/sig_events/rules/register_rules';
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
import { backfillWiredStreamViews } from './lib/streams/esql_views/backfill_wired_stream_views';
import { FeatureService } from './lib/streams/feature/feature_service';
import { ProcessorSuggestionsService } from './lib/streams/ingest_pipelines/processor_suggestions_service';
import { registerStreamsSavedObjects } from './lib/saved_objects/register_saved_objects';
import { ModelSettingsConfigService } from './lib/sig_events/saved_objects/model_settings_config_service';
import { TaskService } from './lib/tasks/task_service';
import { InsightService } from './lib/sig_events/insights/client/insight_service';
import { baseFields } from './lib/streams/component_templates/logs_layer';
import { ecsBaseFields } from './lib/streams/component_templates/logs_ecs_layer';
import { registerStreamsAgentBuilder } from './agent_builder/register';
import { registerSignificantEventsInferenceFeatures } from './register_significant_events_inference_features';
import { PatternExtractionService } from './lib/pattern_extraction/pattern_extraction_service';

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
  private patternExtractionService?: PatternExtractionService;

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

    this.patternExtractionService = new PatternExtractionService(
      this.config.workers.patternExtraction,
      this.logger.get('patternExtraction')
    );

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

    registerSignificantEventsInferenceFeatures(
      plugins.searchInferenceEndpoints,
      this.logger.get('inference-features')
    );

    const attachmentService = new AttachmentService(core, this.logger);
    const streamsService = new StreamsService(core, this.logger, this.isDev);
    const featureService = new FeatureService(core, this.logger);
    const insightService = new InsightService(core, this.logger);
    const contentService = new ContentService(core, this.logger);
    const queryService = new QueryService(core, this.logger);
    const taskService = new TaskService(plugins.taskManager);
    const modelSettingsConfigService = new ModelSettingsConfigService(this.logger);

    const getScopedClients = async ({
      request,
    }: {
      request: KibanaRequest;
    }): Promise<RouteHandlerScopedClients> => {
      const [coreStart, pluginsStart] = await core.getStartServices();

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

      const [attachmentClient, featureClient, insightClient, contentClient, queryClient] =
        await Promise.all([
          attachmentService.getClient({
            soClient,
            rulesClient: await pluginsStart.alerting.getRulesClientWithRequest(request),
          }),
          featureService.getClient(),
          insightService.getInternalClient(),
          contentService.getClient(),
          queryService.getClient({
            soClient,
            rulesClient: await pluginsStart.alerting.getRulesClientWithRequestInSpace(
              request,
              DEFAULT_SPACE_ID
            ),
          }),
        ]);

      const license = await licensing.getLicense();
      const isSecurityEnabled = license.getFeature('security').isEnabled;

      const streamsClient = await streamsService.getClient({
        attachmentClient,
        queryClient,
        featureClient,
        esClient: scopedClusterClient.asCurrentUser,
        esClientAsInternalUser: coreStart.elasticsearch.client.asInternalUser,
        uiSettingsClient,
        isSecurityEnabled,
      });

      const modelSettingsClient = modelSettingsConfigService.getClient({
        soClient,
      });

      return {
        scopedClusterClient,
        soClient,
        attachmentClient,
        streamsClient,
        featureClient,
        insightClient,
        inferenceClient,
        contentClient,
        queryClient,
        fieldsMetadataClient,
        licensing,
        uiSettingsClient,
        taskClient,
        modelSettingsClient,
        isSecurityEnabled,
      };
    };

    if (plugins.agentBuilder) {
      registerStreamsAgentBuilder({
        agentBuilder: plugins.agentBuilder,
        getScopedClients,
        server: this.server,
        logger: this.logger,
      });
    }

    const telemetryClient = this.ebtTelemetryService.getClient();

    taskService.registerTasks({
      getScopedClients,
      logger: this.logger,
      telemetry: telemetryClient,
      server: this.server,
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
              enable: alertingFeatures,
              manual_run: alertingFeatures,
              manage_rule_settings: alertingFeatures,
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
        patternExtractionService: this.patternExtractionService,
        getScopedClients,
      },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });

    registerFeatureFlags(core, this.logger);

    if (plugins.globalSearch) {
      plugins.globalSearch.registerResultProvider(
        createStreamsGlobalSearchResultProvider(core, this.logger, async () => {
          const [, pluginsStart] = await core.getStartServices();
          const license = await pluginsStart.licensing.getLicense();
          return license.getFeature('security').isEnabled;
        })
      );
    }

    if (this.config.preconfigured.enabled) {
      core
        .getStartServices()
        .then(async ([coreStart]) => {
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const soClient = coreStart.savedObjects.getUnsafeInternalClient();
          // Since the RulesClient cannot be unscoped, we provide a stub client that
          // will throw an error if rules or queries exist in the stream definition.
          // This is a limitation of the config-based streams for now.
          const rulesClient = {
            bulkGetRules() {
              throw new Error('Not implemented');
            },
            create() {
              throw new Error('Not implemented');
            },
            update() {
              throw new Error('Not implemented');
            },
          } as unknown as RulesClient;

          const [attachmentClient, featureClient, queryClient] = await Promise.all([
            attachmentService.getClient({ soClient, rulesClient }),
            featureService.getClient(),
            queryService.getClient({ soClient, rulesClient }),
          ]);

          const streamsClient = await streamsService.getClient({
            attachmentClient,
            queryClient,
            featureClient,
            esClient,
            esClientAsInternalUser: esClient,
            uiSettingsClient: coreStart.uiSettings.asScopedToClient(soClient),
            isSecurityEnabled: false,
          });

          await streamsClient.enableStreams();

          await streamsClient.bulkUpsert(
            this.config.preconfigured.stream_definitions.map(({ name, ...definition }) => ({
              name,
              request: Streams.all.UpsertRequest.parse(
                ROOT_STREAM_NAMES.includes(name)
                  ? {
                      ...definition,
                      stream: {
                        ...definition.stream,
                        ingest: {
                          ...definition.stream.ingest,
                          wired: {
                            ...definition.stream.ingest.wired,
                            fields: name === LOGS_ECS_STREAM_NAME ? ecsBaseFields : baseFields,
                          },
                        },
                      },
                    }
                  : definition
              ),
            }))
          );
          this.logger.info('Streams preconfigured successfully');
        })
        .catch((error) => {
          this.logger.error(`Error preconfiguring streams: ${error}`);
        });
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
      this.server.inference = plugins.inference;
      this.server.taskManager = plugins.taskManager;
      this.server.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
    }

    this.processorSuggestionsService.setConsoleStart(plugins.console);

    const soClient = core.savedObjects.getUnsafeInternalClient();
    const startupUiSettingsClient = core.uiSettings.asScopedToClient(soClient);

    startupUiSettingsClient
      .get<boolean>(OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS)
      .then((isWiredStreamViewsEnabled) =>
        backfillWiredStreamViews({
          esClient: core.elasticsearch.client.asInternalUser,
          logger: this.logger,
          isWiredStreamViewsEnabled,
        })
      )
      .catch((err: Error) => {
        this.logger.error(`Failed to backfill wired stream views on startup: ${err?.message}`, {
          error: err,
        });
      });

    return {};
  }

  public async stop() {
    await this.patternExtractionService?.stop();
  }
}
