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
import { isNotFoundError } from '@kbn/es-errors';
import type { StreamsConfig } from '../common/config';
import {
  STREAMS_API_PRIVILEGES,
  STREAMS_CONSUMER,
  STREAMS_FEATURE_ID,
  STREAMS_SETTINGS_DOCUMENT_ID,
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
import type { FeatureClient } from './lib/streams/feature/feature_client';
import type { QueryClient } from './lib/streams/assets/query/query_client';
import { ProcessorSuggestionsService } from './lib/streams/ingest_pipelines/processor_suggestions_service';
import { registerStreamsSavedObjects } from './lib/saved_objects/register_saved_objects';
import { TaskService } from './lib/tasks/task_service';
import { InsightService } from './lib/sig_events/insights/client/insight_service';
import { baseFields } from './lib/streams/component_templates/logs_layer';
import { ecsBaseFields } from './lib/streams/component_templates/logs_ecs_layer';
import { registerStreamsAgentBuilder } from './agent_builder/register';
import { registerSignificantEventsInferenceFeatures } from './register_significant_events_inference_features';
import { registerSuggestionsInferenceFeatures } from './register_suggestions_inference_features';
import { PatternExtractionService } from './lib/pattern_extraction/pattern_extraction_service';
import { registerFieldsMetadataExtractors } from './register_fields_metadata_extractors';
import { createStreamsSettingsStorageClient } from './lib/streams/storage/streams_settings_storage_client';
import {
  createContinuousKiExtractionWorkflowService,
  type ContinuousKiExtractionWorkflowService,
} from './lib/workflows/continuous_extraction_workflow';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginStart {}

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
    registerSuggestionsInferenceFeatures(
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
    const getScopedClients = async ({
      request,
    }: {
      request: KibanaRequest;
    }): Promise<RouteHandlerScopedClients> => {
      const [coreStart, pluginsStart] = await core.getStartServices();

      const scopedSoClient = coreStart.savedObjects.getScopedClient(request);
      const uiSettingsClient = coreStart.uiSettings.asScopedToClient(scopedSoClient);
      const globalUiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(scopedSoClient);

      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
      const soClient = scopedSoClient;
      const inferenceClient = pluginsStart.inference.getClient({ request });
      const licensing = pluginsStart.licensing;
      const fieldsMetadataClient = await pluginsStart.fieldsMetadata.getClient(request);
      const taskClient = await taskService.getClient(
        coreStart,
        pluginsStart.taskManager,
        this.logger
      );

      const [attachmentClient, insightClient, contentClient] = await Promise.all([
        attachmentService.getClient({
          soClient,
          rulesClient: await pluginsStart.alerting.getRulesClientWithRequest(request),
        }),
        insightService.getInternalClient(),
        contentService.getClient(),
      ]);

      let featureClientPromise: Promise<FeatureClient> | undefined;
      const getFeatureClient = (): Promise<FeatureClient> => {
        featureClientPromise ??= featureService.getClient();
        return featureClientPromise;
      };

      let queryClientPromise: Promise<QueryClient> | undefined;
      const getQueryClient = (): Promise<QueryClient> => {
        queryClientPromise ??= (async () => {
          const rulesClient = await pluginsStart.alerting.getRulesClientWithRequestInSpace(
            request,
            DEFAULT_SPACE_ID
          );
          return queryService.getClient({
            esClient: coreStart.elasticsearch.client.asInternalUser,
            soClient,
            rulesClient,
          });
        })();
        return queryClientPromise;
      };

      const license = await licensing.getLicense();
      const isSecurityEnabled = license.getFeature('security').isEnabled;

      const streamsClient = await streamsService.getClient({
        attachmentClient,
        getQueryClient,
        getFeatureClient,
        esClient: scopedClusterClient.asCurrentUser,
        esClientAsInternalUser: coreStart.elasticsearch.client.asInternalUser,
        uiSettingsClient,
        isSecurityEnabled,
      });

      const streamsSettingsStorageClient = createStreamsSettingsStorageClient(
        coreStart.elasticsearch.client.asInternalUser,
        this.logger
      );

      return {
        scopedClusterClient,
        soClient,
        attachmentClient,
        streamsClient,
        getFeatureClient,
        insightClient,
        inferenceClient,
        contentClient,
        getQueryClient,
        fieldsMetadataClient,
        licensing,
        uiSettingsClient,
        globalUiSettingsClient,
        taskClient,
        streamsSettingsStorageClient,
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

    let continuousKiExtractionWorkflowService: ContinuousKiExtractionWorkflowService | undefined;

    if (plugins.workflowsManagement) {
      continuousKiExtractionWorkflowService = createContinuousKiExtractionWorkflowService(
        this.logger,
        plugins.workflowsManagement.management
      );
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

    const routeRegistrationOptions = {
      dependencies: {
        server: this.server,
        telemetry: telemetryClient,
        processorSuggestions: this.processorSuggestionsService,
        patternExtractionService: this.patternExtractionService,
        getScopedClients,
        continuousKiExtractionWorkflowService,
      },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    };

    registerRoutes({ repository: streamsRouteRepository, ...routeRegistrationOptions });

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

    core
      .getStartServices()
      .then(async ([coreStart]) => {
        const soClient = coreStart.savedObjects.getUnsafeInternalClient();
        const startupUiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
        const esClient = coreStart.elasticsearch.client.asInternalUser;

        if (this.config.preconfigured.enabled) {
          const streamsSettingsStorageClient = createStreamsSettingsStorageClient(
            esClient,
            this.logger
          );

          const streamsSettings = await streamsSettingsStorageClient
            .get({ id: STREAMS_SETTINGS_DOCUMENT_ID })
            .then((response) => response._source)
            .catch((error) => {
              if (isNotFoundError(error)) {
                // This is an expected error that gets thrown when the settings
                // document doesn't exist, which is the case on the initial startup.
                return;
              }
              throw error;
            });

          if (streamsSettings?.wired_streams_disabled_by_user) {
            this.logger.info('Wired streams are disabled by user, skipping preconfiguration');
          } else {
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

            const attachmentClient = await attachmentService.getClient({ soClient, rulesClient });

            // featureClient and queryClient are not needed for enableStreams()
            // and bulkUpsert() during preconfiguration, so we don't create them here.
            const streamsClient = await streamsService.getClient({
              attachmentClient,
              esClient,
              esClientAsInternalUser: esClient,
              uiSettingsClient: coreStart.uiSettings.asScopedToClient(soClient),
              isSecurityEnabled: false,
            });

            const streamDefinitions = this.config.preconfigured.stream_definitions.map(
              ({ name, ...definition }) => ({
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
              })
            );

            if (streamDefinitions.length > 0) {
              await streamsClient.enableStreams();

              await streamsClient.bulkUpsert(streamDefinitions);
            } else {
              await streamsClient.enableStreams({ defer: true });
            }

            this.logger.info('Streams preconfigured successfully');
          }
        }

        startupUiSettingsClient
          .get<boolean>(OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS)
          .then((isWiredStreamViewsEnabled) =>
            backfillWiredStreamViews({
              esClient,
              logger: this.logger,
              isWiredStreamViewsEnabled,
            })
          )
          .catch((err: Error) => {
            this.logger.error(`Failed to backfill wired stream views on startup: ${err?.message}`, {
              error: err,
            });
          });
      })
      .catch((error) => {
        this.logger.error(`Error preconfiguring streams: ${error}`);
      });

    registerFieldsMetadataExtractors({
      fieldsMetadata: plugins.fieldsMetadata,
      logger: this.logger,
    });

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
      this.server.licensing = plugins.licensing;
      this.server.taskManager = plugins.taskManager;
      this.server.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
    }

    this.processorSuggestionsService.setConsoleStart(plugins.console);

    return {};
  }

  public async stop() {
    await this.patternExtractionService?.stop();
  }
}
