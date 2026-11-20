/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import {
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  SUPPORTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from '@kbn/agent-builder-common/attachments';
import { createAgentBuilderStartContract } from './run_services/create_start_contract';
import { createAgentBuilderRunServices } from './run_services/create_agent_builder_run_services';
import {
  AGENT_BUILDER_RUN_SETTINGS_ID,
  getAgentBuilderRunSettings,
} from './run_services/run_settings';
import { registerAgentBuilderParity } from './run_services/parity';
import type { AgentBuilderConfig } from './config';
import { registerTracingExporter } from './tracing/register_tracing';
import type { ServiceManager } from './services';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerRoutes } from './routes';
import { agentBuilderSpaceSettingsType } from './saved_objects';
import { registerUISettings } from './ui_settings';
import type { AgentBuilderHandlerContext } from './request_handler_context';
import { registerAgentBuilderHandlerContext } from './request_handler_context';
import { createAgentBuilderUsageCounter } from './telemetry/usage_counters';
import { TrackingService } from './telemetry/tracking_service';
import { registerTelemetryCollector } from './telemetry/telemetry_collector';
import { AnalyticsService } from './telemetry';
import { registerSampleData } from './register_sample_data';
import { registerTaskDefinitions } from './services/execution';
import type { TaskHandler } from './services/execution/task/task_handler';
import { taskType as runAgentTaskType } from './task_types/run_agent.task';
import { createAdminPrivilegeSwitcher } from './capabilities/admin_privilege_switcher';
import { registerInferenceFeatures } from './inference_features';
import { createConversationEventBus } from './workflows/triggers/conversation_event_bus';
import { registerAgentBuilderProcessWorkflowDefinitions } from './workflows';
import { registerAgentBuilderWorkflowSteps } from './workflows/register_workflow_steps';
import { registerConversationWorkflowEventBridge } from './workflows/triggers/event_bridge';
import { apiPrivileges } from '../common/features';
import { runToolIdBackfill } from './backfills/tool_id_backfill';
import { RecommendedEndpointsPoller } from './recommended_endpoints_poller';
import { getDeploymentInfo } from './utils/deployment_info';
import type { AgentBuilderRunServices } from './run_services/create_agent_builder_run_services';

export class AgentBuilderPlugin
  implements
    Plugin<
      AgentBuilderPluginSetup,
      AgentBuilderPluginStart,
      AgentBuilderSetupDependencies,
      AgentBuilderStartDependencies
    >
{
  private logger: Logger;
  private config: AgentBuilderConfig;
  private readonly env: PluginInitializerContext['env'];
  private services?: AgentBuilderRunServices;
  private get serviceManager(): ServiceManager {
    if (!this.services) throw new Error('Agent Builder services are not set up');
    return this.services.serviceManager;
  }
  /** The handler `agent-builder:run-agent` runs with in Kibana (`services/execution/task/task_handler.ts`). */
  private getTaskHandler = (): TaskHandler => {
    const services = this.serviceManager.internalStart;
    if (!services) {
      throw new Error('getTaskHandler called before service init');
    }
    return services.taskHandler;
  };
  private cloudSetup?: CloudSetup;
  private usageCounter?: UsageCounter;
  private trackingService?: TrackingService;
  private analyticsService?: AnalyticsService;
  private home: HomeServerPluginSetup | null = null;
  private teardownTracing?: () => Promise<void>;
  private startDeps?: AgentBuilderStartDependencies;
  private readonly conversationEventBus = createConversationEventBus();
  private recommendedEndpointsPoller?: RecommendedEndpointsPoller;
  constructor(context: PluginInitializerContext<AgentBuilderConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.env = context.env;
  }

  setup(
    coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>,
    setupDeps: AgentBuilderSetupDependencies
  ): AgentBuilderPluginSetup {
    this.home = setupDeps.home;
    this.cloudSetup = setupDeps.cloud;

    setupDeps.files.registerFileKind({
      id: CHAT_ATTACHMENT_IMAGES_FILE_KIND,
      allowedMimeTypes: [...SUPPORTED_IMAGE_MIME_TYPES],
      maxSizeBytes: MAX_IMAGE_BYTES,
      http: {
        create: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
        download: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    });

    // Create usage counter for telemetry (if usageCollection is available)
    if (setupDeps.usageCollection) {
      this.usageCounter = createAgentBuilderUsageCounter(setupDeps.usageCollection);
      if (this.usageCounter) {
        this.trackingService = new TrackingService(this.usageCounter, this.logger.get('telemetry'));
        registerTelemetryCollector(setupDeps.usageCollection, this.logger.get('telemetry'));
      }

      this.logger.info('AgentBuilder telemetry initialized');
    } else {
      this.logger.warn('Usage collection plugin not available, telemetry disabled');
    }

    registerInferenceFeatures({ searchInferenceEndpoints: setupDeps.searchInferenceEndpoints });

    // Register server-side EBT events for Agent Builder
    this.analyticsService = new AnalyticsService(
      coreSetup.analytics,
      this.logger.get('telemetry').get('analytics')
    );
    this.analyticsService.registerAgentBuilderEventTypes(coreSetup.analytics);

    const getCoreStart = async () => (await coreSetup.getStartServices())[0];
    this.services = createAgentBuilderRunServices({
      config: this.config,
      logger: this.logger,
      workflowsManagement: setupDeps.workflowsManagement,
      trackingService: this.trackingService,
      analyticsService: this.analyticsService,
      cloud: setupDeps.cloud,
      usageApi: setupDeps.usageApi,
      actions: setupDeps.actions,
      getActionsStart: async () => (await coreSetup.getStartServices())[1].actions,
      getInferenceStart: async () => (await coreSetup.getStartServices())[1].inference,
      getAgentBuilderSml: () => {
        if (!this.startDeps) {
          throw new Error('Agent Builder SML not available — plugin has not started');
        }
        return this.startDeps.agentBuilderSml;
      },
      getCoreStart,
      uiSettings: coreSetup.uiSettings,
      // What a task process needs to register what this Kibana registers: sent with every dispatch.
      taskProcess: {
        registerSettings: (pluginId, getSettings) =>
          setupDeps.workflowsExtensions.registerTaskProcessSettings(pluginId, getSettings),
      },
    });
    const { setupContract } = this.services;

    // `agent-builder:run-agent` runs in its own task process when the workflows execution engine is
    // available (it is what builds the agent builder registries a process needs): registered through
    // its `registerHostedTaskType`, with Kibana's own handler sent as `host.plugins.agentBuilder` so
    // a run in Kibana never has to build the engine's process runtime for itself. Without the engine
    // (it is an optional plugin), the task always runs in Kibana, as before.
    if (setupDeps.workflowsExecutionEngine) {
      setupDeps.workflowsExecutionEngine.registerHostedTaskType(runAgentTaskType, {
        plugins: async () => ({ agentBuilder: { taskHandler: this.getTaskHandler() } }),
      });
    } else {
      registerTaskDefinitions({
        taskManager: setupDeps.taskManager,
        getTaskHandler: () => this.getTaskHandler(),
      });
    }

    registerFeatures({ features: setupDeps.features });

    coreSetup.savedObjects.registerType(agentBuilderSpaceSettingsType);

    // Phantom capability: not a registered feature privilege. Used as an admin check
    // (e.g. superuser / wildcard roles get true). Resolved in the switcher via ES hasPrivileges.
    coreSetup.capabilities.registerProvider(() => ({
      agentBuilder: {
        isAdmin: false,
      },
    }));

    coreSetup.capabilities.registerSwitcher(
      createAdminPrivilegeSwitcher(coreSetup.getStartServices, this.logger.get('capabilities')),
      { capabilityPath: 'agentBuilder.*' }
    );

    registerUISettings({ uiSettings: coreSetup.uiSettings });
    registerAgentBuilderWorkflowSteps(setupDeps.workflowsExtensions, {
      serviceManager: this.serviceManager,
      getCoreStart,
      getSpaces: async () => (await coreSetup.getStartServices())[1].spaces,
    });
    registerAgentBuilderProcessWorkflowDefinitions(setupDeps.workflowsExtensions);

    registerAgentBuilderHandlerContext({ coreSetup });

    const router = coreSetup.http.createRouter<AgentBuilderHandlerContext>();
    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      pluginsSetup: setupDeps,
      getInternalServices: this.services.getInternalServices,
      trackingService: this.trackingService,
      analyticsService: this.analyticsService,
    });

    // What a task process needs to register what this Kibana registered: the config, and the ids
    // of what the registries hold (read at each dispatch, because a plugin may register any time).
    const { registrations } = this.services;
    registerAgentBuilderParity(setupDeps.workflowsExtensions, () => ({
      ...registrations.ids(),
      // The SML plugin owns its registry: the types its dependents register, read at each dispatch.
      smlTypes: setupDeps.agentBuilderSml.getRegisteredTypeIds(),
    }));
    setupDeps.workflowsExtensions.registerTaskProcessSettings(AGENT_BUILDER_RUN_SETTINGS_ID, () =>
      getAgentBuilderRunSettings({
        config: this.config,
        cloud: this.cloudSetup,
        env: this.env,
        getSearchInferenceEndpoints: () => this.startDeps?.searchInferenceEndpoints,
      })
    );

    return setupContract;
  }

  start(coreStart: CoreStart, startDeps: AgentBuilderStartDependencies): AgentBuilderPluginStart {
    this.startDeps = startDeps;
    void registerTracingExporter({
      core: coreStart,
      tracingConfig: this.config.tracing,
    }).then((teardownTracing) => {
      this.teardownTracing = teardownTracing;
    });
    const {
      inference,
      spaces,
      actions,
      taskManager,
      searchInferenceEndpoints,
      licensing,
      security: securityPlugin,
    } = startDeps;
    const { elasticsearch, http, security, uiSettings, savedObjects, featureFlags } = coreStart;

    this.cleanupLegacySmlTasks(taskManager).catch((error) => {
      this.logger.warn(`Failed to clean up legacy SML tasks: ${(error as Error).message}`);
    });

    this.runBackfill(elasticsearch).catch((error) => {
      this.logger.error(`Backfill failed: ${(error as Error).message}`);
    });

    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      securityPlugin,
      elasticsearch,
      http,
      inference,
      spaces,
      actions,
      uiSettings,
      savedObjects,
      featureFlags,
      taskManager,
      trackingService: this.trackingService,
      analyticsService: this.analyticsService,
      searchInferenceEndpoints,
      licensing,
      deploymentInfo: getDeploymentInfo({
        cloud: this.cloudSetup,
        packageInfo: this.env.packageInfo,
        airgapped: this.env.airgapped,
      }),
      deductiveRegister: this.config.deductive?.register ?? false,
      conversationEventBus: this.conversationEventBus,
    });

    registerConversationWorkflowEventBridge(
      this.conversationEventBus,
      startDeps.workflowsExtensions,
      this.logger,
      this.services?.conversationUpdatedOptIns ?? []
    );

    if (this.home) {
      registerSampleData(this.home, this.logger);
    }

    this.recommendedEndpointsPoller = new RecommendedEndpointsPoller({
      logger: this.logger.get('recommended-endpoints-poller'),
      esClient: elasticsearch.client.asInternalUser,
      features: searchInferenceEndpoints.features,
    });
    this.recommendedEndpointsPoller.start();

    return createAgentBuilderStartContract({
      startServices,
      coreStart,
      spaces,
      inference,
      searchInferenceEndpoints,
      trackingService: this.trackingService,
      logger: this.logger,
      onSkillRegistered: this.services?.registrations.recordSkill,
    });
  }

  async stop() {
    this.recommendedEndpointsPoller?.stop();
    await this.teardownTracing?.();
  }

  /**
   * Applies all registered tool ID backfills.
   */
  private async runBackfill(elasticsearch: CoreStart['elasticsearch']): Promise<void> {
    const logger = this.logger.get('backfill');
    const esClient = elasticsearch.client.asInternalUser;
    await runToolIdBackfill(logger, esClient);
  }

  /**
   * Remove orphaned SML crawler task instances from older scheduled-task id prefixes.
   * Safe on every start — uses a single `bulkRemove` for the known legacy instance ids.
   */
  private async cleanupLegacySmlTasks(taskManager: AgentBuilderStartDependencies['taskManager']) {
    const logger = this.logger.get('sml-migration');
    const legacyTaskIds = [
      'agent_builder:sml_crawler:visualization',
      'agent_builder:sml_crawler:connector',
      'agent_builder:sml_crawler:dashboard',
      'agent_builder:sml_crawler:workflow',
    ];
    try {
      await taskManager.bulkRemove(legacyTaskIds);
    } catch (error) {
      logger.warn(`Failed to remove legacy SML crawler tasks: ${(error as Error).message}`);
    }
  }
}
