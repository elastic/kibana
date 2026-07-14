/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  FeatureFlagsStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { RulesClientCreateOptions } from '@kbn/alerting-plugin/server';
import { distinctUntilChanged, filter, skip } from 'rxjs';
import type { Subscription } from 'rxjs';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { SignificantEventsConfig } from '../common/config';
import { isSignificantEventsMemoryEnabled } from './memory_and_investigation/lib/memory/is_significant_events_memory_enabled';
import { RelayClient } from './lib/slack_app/relay_client';
import { getRelayAppConnectionSavedObjectType } from './lib/slack_app/saved_object';
import { installWorkflows } from './lib/workflows/setup/install_workflows';
import { registerFeatureFlags } from './feature_flags';
import { registerRules } from './lib/significant_events/rules/register_rules';
import { getSignificantEventsTuningConfig } from './lib/significant_events/helpers/get_significant_events_tuning_config';

import { createSignificantEventsAlertingContextResolver } from './lib/significant_events/alerting/significant_events_alerting_context';
import type { SignificantEventsAlertingContext } from './lib/significant_events/alerting/significant_events_alerting_context';
import { EbtTelemetryService } from './lib/telemetry';
import { significantEventsRouteRepository } from './routes';
import type { GetScopedClients, RouteHandlerScopedClients } from './routes/types';
import type {
  SignificantEventsPluginSetupDependencies,
  SignificantEventsPluginStartDependencies,
} from './types';
import {
  type KnowledgeIndicatorClient,
  KnowledgeIndicatorService,
  initializeKnowledgeIndicatorsTemplate,
} from './lib/knowledge_indicators';
import {
  createSignificantEventsClients,
  createSignificantEventsServices,
  initializeSignificantEventsTemplates,
} from './lib/significant_events/significant_events_clients';
import { createMemoryToolsOptions, registerStreamsAgentBuilder } from './agent_builder/register';
import { registerAgentBuilderSmlTypes } from './agent_builder/sml/register_sml_types';
import { registerStreamsMemoryAgentBuilder } from './memory_and_investigation/skills/memory/register';
import { registerSignificantEventsInferenceFeatures } from './register_significant_events_inference_features';
import {
  createContinuousKiOnboardingWorkflowService,
  type ContinuousKiOnboardingWorkflowService,
} from './lib/workflows/continuous_onboarding_workflow';
import {
  createSignificantEventsScheduledWorkflowsService,
  type SignificantEventsScheduledWorkflowsService,
} from './lib/workflows/significant_events_scheduled_workflows';
import { createWorkflowClients } from './lib/workflows/create_workflow_clients';
import { installMemoryWorkflows } from './memory_and_investigation/lib/memory/install_managed_workflows';
import { isInvestigationEnabled } from './memory_and_investigation/lib/investigation/is_investigation_enabled';
import { installInvestigationWorkflow } from './memory_and_investigation/lib/investigation/install_investigation_workflow';
import {
  SIGNIFICANT_EVENTS_INVESTIGATION_ENABLED_FLAG,
  SIGNIFICANT_EVENTS_MEMORY_ENABLED_FLAG,
} from '../common/memory_and_investigation';
import { SIGNIFICANT_EVENT_TIERED_FEATURES } from '../common/constants';

const SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER = 'significant_events';

export interface SignificantEventsPluginSetup {
  registerKnowledgeIndicatorClientProvider(
    provider: (request: KibanaRequest) => Promise<KnowledgeIndicatorClient>
  ): void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SignificantEventsPluginStart {}

export class SignificantEventsPlugin
  implements
    Plugin<
      SignificantEventsPluginSetup,
      SignificantEventsPluginStart,
      SignificantEventsPluginSetupDependencies,
      SignificantEventsPluginStartDependencies
    >
{
  public config: SignificantEventsConfig;
  public logger: Logger;
  public server?: StreamsServer;
  private isDev: boolean;
  private ebtTelemetryService = new EbtTelemetryService();
  private getScopedClients?: GetScopedClients;
  private subscriptions: Subscription[] = [];
  private kiProvider?: (request: KibanaRequest) => Promise<KnowledgeIndicatorClient>;
  private kibanaVersion: string;

  constructor(context: PluginInitializerContext<SignificantEventsConfig>) {
    this.isDev = context.env.mode.dev;
    this.config = context.config.get();
    this.logger = context.logger.get();
    this.kibanaVersion = context.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<SignificantEventsPluginStartDependencies>,
    plugins: SignificantEventsPluginSetupDependencies
  ): SignificantEventsPluginSetup {
    this.server = {
      logger: this.logger,
      workflowsManagement: plugins.workflowsManagement,
      cloud: plugins.cloud,
      kibanaVersion: this.kibanaVersion,
    } as StreamsServer;
    this.server.workflowsManagement = plugins.workflowsManagement;

    core.savedObjects.registerType(getRelayAppConnectionSavedObjectType());

    this.ebtTelemetryService.setup(core.analytics);

    registerRules({ plugins, logger: this.logger.get('rules') });
    registerSignificantEventsInferenceFeatures(
      plugins.searchInferenceEndpoints,
      this.logger.get('inference-features')
    );

    const significantEventsServices = createSignificantEventsServices();
    const knowledgeIndicatorService = new KnowledgeIndicatorService(core, this.logger);
    const { streams: streamsSetup } = plugins;

    this.getScopedClients = async ({
      request,
      rulesClientOptions,
    }: {
      request: KibanaRequest;
      rulesClientOptions?: RulesClientCreateOptions;
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

      const [attachmentClient, tuningConfig] = await Promise.all([
        streamsSetup.getAttachmentClient({ request }),
        getSignificantEventsTuningConfig(globalUiSettingsClient, this.logger),
      ]);

      const streamsClient = await streamsSetup.getStreamsClient({ request, rulesClientOptions });

      const space = pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

      const significantEventsClients = createSignificantEventsClients({
        services: significantEventsServices,
        esClient: scopedClusterClient.asCurrentUser,
        space,
      });

      const getAlertingRulesClient = async () =>
        pluginsStart.alerting.getRulesClientWithRequestInSpace(
          request,
          DEFAULT_SPACE_ID,
          rulesClientOptions
        );

      const getAlertingV2RulesClient = async () =>
        pluginsStart.alertingVTwo
          ? pluginsStart.alertingVTwo.getRulesClientWithRequestInSpace(request, DEFAULT_SPACE_ID)
          : undefined;

      const resolveSignificantEventsAlertingContext =
        createSignificantEventsAlertingContextResolver({
          uiSettingsClient,
          getAlertingRulesClient,
          getAlertingV2RulesClient,
          logger: this.logger,
        });

      const createKnowledgeIndicatorClient = (context: SignificantEventsAlertingContext) =>
        knowledgeIndicatorService.getClient({
          esClient: scopedClusterClient.asInternalUser,
          soClient,
          context,
          config: tuningConfig,
        });

      let kiClientPromise: ReturnType<typeof createKnowledgeIndicatorClient> | undefined;
      const getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient> = this.kiProvider
        ? () => this.kiProvider!(request)
        : () => {
            kiClientPromise ??= (async () =>
              createKnowledgeIndicatorClient(await resolveSignificantEventsAlertingContext()))();
            return kiClientPromise;
          };

      const license = await licensing.getLicense();
      const isSecurityEnabled = license.getFeature('security').isEnabled;

      return {
        scopedClusterClient,
        soClient,
        attachmentClient,
        getSignificantEventsAlertingContext: resolveSignificantEventsAlertingContext,
        getKnowledgeIndicatorClient,
        ...significantEventsClients,
        inferenceClient,
        fieldsMetadataClient,
        streamsClient,
        licensing,
        uiSettingsClient,
        globalUiSettingsClient,
        isSecurityEnabled,
        tuningConfig,
      };
    };

    streamsSetup.registerKnowledgeIndicatorClientProvider(async (request) => {
      const { getKnowledgeIndicatorClient } = await this.getScopedClients!({ request });
      return getKnowledgeIndicatorClient();
    });

    const telemetryClient = this.ebtTelemetryService.getClient();

    const workflowClients = createWorkflowClients(
      plugins.workflowsManagement?.management,
      telemetryClient
    );
    const streamsKIsOnboardingClient = workflowClients.streamsKIsOnboardingClient;

    if (plugins.agentBuilderSml && this.getScopedClients) {
      registerAgentBuilderSmlTypes({
        agentBuilderSml: plugins.agentBuilderSml,
        getScopedClients: this.getScopedClients,
      });
    }

    if (plugins.agentBuilder) {
      void core
        .getStartServices()
        .then(async ([coreStart]) => {
          const { getScopedClients, server } = this;
          if (!getScopedClients || !server) return;
          const investigationEnabled = await isInvestigationEnabled(coreStart.featureFlags);

          await registerStreamsAgentBuilder({
            agentBuilder: plugins.agentBuilder!,
            getScopedClients,
            server,
            logger: this.logger,
            telemetry: telemetryClient,
            streamsKIsOnboardingClient,
            investigationEnabled,
          });
        })
        .catch((err) => {
          this.logger.error(`Failed to register agent builder: ${err.message}`);
        });
    }

    let continuousKiOnboardingWorkflowService: ContinuousKiOnboardingWorkflowService | undefined;
    let significantEventsScheduledWorkflowsService:
      | SignificantEventsScheduledWorkflowsService
      | undefined;

    if (plugins.workflowsManagement && streamsKIsOnboardingClient) {
      continuousKiOnboardingWorkflowService = createContinuousKiOnboardingWorkflowService({
        logger: this.logger,
        managementApi: plugins.workflowsManagement.management,
        streamsKIsOnboardingClient,
      });
    }

    plugins.workflowsExtensions?.registerManagedWorkflowOwner(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
    );

    if (plugins.workflowsManagement && plugins.workflowsExtensions) {
      significantEventsScheduledWorkflowsService = createSignificantEventsScheduledWorkflowsService(
        {
          logger: this.logger,
          managementApi: plugins.workflowsManagement.management,
          getManagedWorkflowsClient: async () => {
            const [, pluginsStart] = await core.getStartServices();
            if (!pluginsStart.workflowsExtensions) {
              throw new Error('Workflows extensions are not available');
            }
            return pluginsStart.workflowsExtensions.initManagedWorkflowsClient(
              SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
            );
          },
        }
      );
    }

    core.pricing.registerProductFeatures(SIGNIFICANT_EVENT_TIERED_FEATURES);
    registerFeatureFlags(core, this.logger, {
      isAlertingV2PluginAvailable: 'alertingVTwo' in plugins,
    });

    registerRoutes({
      repository: significantEventsRouteRepository,
      dependencies: {
        server: this.server,
        telemetry: telemetryClient,
        getScopedClients: this.getScopedClients,
        continuousKiOnboardingWorkflowService,
        significantEventsScheduledWorkflowsService,
        workflowClients,
        getSpaceId: async (request: KibanaRequest) => {
          const [, pluginsStart] = await core.getStartServices();
          return pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        },
      },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });

    return {
      registerKnowledgeIndicatorClientProvider: (provider) => {
        this.kiProvider = provider;
      },
    };
  }

  public start(
    core: CoreStart,
    plugins: SignificantEventsPluginStartDependencies
  ): SignificantEventsPluginStart {
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
      this.server.spaces = plugins.spaces;
      this.server.workflowsExtensions = plugins.workflowsExtensions;
      this.server.agentBuilder = plugins.agentBuilder;

      // Built once here rather than per-request: reads TLS cert/key/CA files from disk
      // and keeps its own connection pool (see RelayClient's class doc).
      const relayService = this.config.relayService;
      if (relayService) {
        this.server.relayClient = new RelayClient({
          baseUrl: relayService.url,
          tls: relayService.tls,
          logger: this.logger.get('relay-client'),
        });
      }
    }

    initializeSignificantEventsTemplates({
      esClient: core.elasticsearch.client.asInternalUser,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(
        `Failed to initialize significant events templates: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    const memoryEnabled$ = core.featureFlags
      .getBooleanValue$(SIGNIFICANT_EVENTS_MEMORY_ENABLED_FLAG, false)
      .pipe(
        distinctUntilChanged(),
        skip(1),
        filter((enabled) => enabled)
      );

    const investigationEnabled$ = core.featureFlags
      .getBooleanValue$(SIGNIFICANT_EVENTS_INVESTIGATION_ENABLED_FLAG, false)
      .pipe(
        distinctUntilChanged(),
        skip(1),
        filter((enabled) => enabled)
      );

    initializeKnowledgeIndicatorsTemplate({
      esClient: core.elasticsearch.client.asInternalUser,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(
        `Failed to initialize knowledge indicators template: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    if (plugins.workflowsExtensions) {
      const { workflowsExtensions } = plugins;

      void this.installManagedWorkflows(workflowsExtensions, core.featureFlags).catch(
        (error: unknown) => {
          this.logger.error(
            `significant_events: Failed to install managed workflows: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      );

      this.subscriptions.push(
        memoryEnabled$.subscribe(() => {
          void this.installMemoryWorkflowsIfEnabled(workflowsExtensions, core.featureFlags).catch(
            (error: unknown) => {
              this.logger.error(
                `significant_events: Failed to install memory managed workflows after feature flag change: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          );
        })
      );

      this.subscriptions.push(
        investigationEnabled$.subscribe(() => {
          void this.installInvestigationWorkflowIfEnabled(
            workflowsExtensions,
            core.featureFlags
          ).catch((error: unknown) => {
            this.logger.error(
              `significant_events: Failed to install investigation managed workflow after feature flag change: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          });
        })
      );
    }

    if (plugins.agentBuilder && this.server && this.getScopedClients) {
      const isMemoryEnabled = () => isSignificantEventsMemoryEnabled(core.featureFlags);

      const memoryToolsOptions = createMemoryToolsOptions({
        getScopedClients: this.getScopedClients,
        server: this.server,
        logger: this.logger,
      });

      registerStreamsMemoryAgentBuilder({
        agentBuilder: plugins.agentBuilder,
        memoryToolsOptions,
        logger: this.logger,
        isMemoryEnabled,
      })
        .then(({ onMemoryEnabled }) => {
          this.subscriptions.push(
            memoryEnabled$.subscribe(() => {
              void onMemoryEnabled();
            })
          );
        })
        .catch((err) => {
          this.logger.error(`Failed to register significant events memory skills: ${err.message}`);
        });
    }

    return {};
  }

  private async installMemoryWorkflowsIfEnabled(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart,
    featureFlags: FeatureFlagsStart
  ): Promise<void> {
    if (!(await isSignificantEventsMemoryEnabled(featureFlags))) {
      this.logger.debug(
        'significant_events: memory is disabled, skipping memory workflow installation'
      );
      return;
    }

    const client = await workflowsExtensions.initManagedWorkflowsClient(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
    );
    await installMemoryWorkflows({ client });
    await client.ready();
  }

  private async installInvestigationWorkflowIfEnabled(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart,
    featureFlags: FeatureFlagsStart
  ): Promise<void> {
    if (!(await isInvestigationEnabled(featureFlags))) {
      this.logger.debug(
        'significant_events: investigation is disabled, skipping investigation workflow installation'
      );
      return;
    }

    const client = await workflowsExtensions.initManagedWorkflowsClient(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
    );
    await installInvestigationWorkflow({ client });
    await client.ready();
  }

  private async installManagedWorkflows(
    workflowsExtensions: WorkflowsExtensionsServerPluginStart,
    featureFlags: FeatureFlagsStart
  ): Promise<void> {
    try {
      const client = await workflowsExtensions.initManagedWorkflowsClient(
        SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
      );

      await installWorkflows({
        client,
        isSignificantEventsMemoryEnabled: await isSignificantEventsMemoryEnabled(featureFlags),
      });

      if (await isInvestigationEnabled(featureFlags)) {
        await installInvestigationWorkflow({ client });
      } else {
        this.logger.debug(
          'significant_events: investigation is disabled, skipping investigation workflow installation'
        );
      }

      this.logger.info('Significant events managed workflows installed');

      await client.ready();
    } catch (error) {
      this.logger.warn(
        `Failed to install significant events managed workflows: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  public async stop() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
