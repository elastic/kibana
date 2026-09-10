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
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  AGENT_BUILDER_DEDUCTIVE_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import {
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  SUPPORTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
} from '@kbn/agent-builder-common/attachments';
import { createConversationPublicClient } from './services/conversation/conversation_public_client';
import { createAttachmentPublicClient } from './services/attachments';
import type { AgentBuilderConfig } from './config';
import { registerTracingExporter } from './tracing/register_tracing';
import { ServiceManager } from './services';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerRoutes } from './routes';
import { agentBuilderSpaceSettingsType } from './saved_objects';
import { registerUISettings, registerGlobalDeductivUISettings } from './ui_settings';
import { getRunAgentStepDefinition, rerankStepDefinition } from './step_types';
import type { AgentBuilderHandlerContext } from './request_handler_context';
import { registerAgentBuilderHandlerContext } from './request_handler_context';
import { createAgentBuilderUsageCounter } from './telemetry/usage_counters';
import { TrackingService } from './telemetry/tracking_service';
import { registerTelemetryCollector } from './telemetry/telemetry_collector';
import { AnalyticsService } from './telemetry';
import { registerSampleData } from './register_sample_data';
import { registerBeforeAgentWorkflowsHook } from './hooks/agent_workflows/register_before_agent_workflows_hook';
import { registerAfterExecutionWorkflowsHook } from './hooks/agent_workflows/register_after_execution_workflows_hook';
import { registerSkillToolsLoaderHook } from './hooks/skills/register_skill_tools_loader_hook';
import { registerTaskDefinitions } from './services/execution';
import { createModelProviderFactory } from './services/execution/runner/model_provider';
import { createSmlTools } from './services/tools/builtin/sml';
import { createConnectorTools } from './services/tools/builtin/connectors';
import { createAdminPrivilegeSwitcher } from './capabilities/admin_privilege_switcher';
import { registerInferenceFeatures } from './inference_features';
import { createConversationEventBus } from './workflows/triggers/conversation_event_bus';
import { registerAttachmentWorkflowSteps, registerConversationWorkflowSteps } from './workflows';
import { registerConversationWorkflowEventBridge } from './workflows/triggers/event_bridge';
import { AGENTBUILDER_FEATURE_ID } from '../common/features';
import { runToolIdBackfill } from './backfills/tool_id_backfill';
import { RecommendedEndpointsPoller } from './recommended_endpoints_poller';
import {
  DEDUCTIVE_AGENT_ID,
  DEDUCTIVE_AVATAR_ICON,
  DEDUCTIVE_ENABLED_FLAG,
} from './services/execution/run_agent/deductive/config';

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
  private serviceManager: ServiceManager;
  private usageCounter?: UsageCounter;
  private trackingService?: TrackingService;
  private analyticsService?: AnalyticsService;
  private home: HomeServerPluginSetup | null = null;
  private teardownTracing?: () => Promise<void>;
  private startDeps?: AgentBuilderStartDependencies;
  private readonly conversationEventBus = createConversationEventBus();
  private isExperimentalEnabled?: (request: KibanaRequest) => Promise<boolean>;
  private recommendedEndpointsPoller?: RecommendedEndpointsPoller;
  constructor(context: PluginInitializerContext<AgentBuilderConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.serviceManager = new ServiceManager(this.config);
  }

  setup(
    coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>,
    setupDeps: AgentBuilderSetupDependencies
  ): AgentBuilderPluginSetup {
    this.home = setupDeps.home;

    setupDeps.files.registerFileKind({
      id: CHAT_ATTACHMENT_IMAGES_FILE_KIND,
      allowedMimeTypes: [...SUPPORTED_IMAGE_MIME_TYPES],
      maxSizeBytes: MAX_IMAGE_BYTES,
      http: {
        create: { requiredPrivileges: [AGENTBUILDER_FEATURE_ID] },
        download: { requiredPrivileges: [AGENTBUILDER_FEATURE_ID] },
        getById: { requiredPrivileges: [AGENTBUILDER_FEATURE_ID] },
        list: { requiredPrivileges: [AGENTBUILDER_FEATURE_ID] },
        delete: { requiredPrivileges: [AGENTBUILDER_FEATURE_ID] },
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
    this.analyticsService.registerAgentBuilderEventTypes();

    const serviceSetups = this.serviceManager.setupServices({
      logger: this.logger.get('services'),
      workflowsManagement: setupDeps.workflowsManagement,
      trackingService: this.trackingService,
      cloud: setupDeps.cloud,
      usageApi: setupDeps.usageApi,
      actions: setupDeps.actions,
    });

    registerTaskDefinitions({
      taskManager: setupDeps.taskManager,
      getTaskHandler: () => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('getTaskHandler called before service init');
        }
        return services.taskHandler;
      },
    });

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
    // Deductiv AI settings: registered in BOTH scopes so they can be configured once in
    // Global Advanced Settings and apply to every user of the deployment (per-user values
    // still take precedence at runtime).
    registerGlobalDeductivUISettings({ uiSettings: coreSetup.uiSettings });

    this.isExperimentalEnabled = async (request: KibanaRequest): Promise<boolean> => {
      const [coreStart] = await coreSetup.getStartServices();
      const soClient = coreStart.savedObjects.getScopedClient(request);
      return coreStart.uiSettings
        .asScopedToClient(soClient)
        .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    };

    setupDeps.workflowsExtensions.registerStepDefinition(
      getRunAgentStepDefinition(this.serviceManager)
    );
    setupDeps.workflowsExtensions.registerStepDefinition(rerankStepDefinition);

    registerConversationWorkflowSteps(setupDeps.workflowsExtensions, {
      getConversationClient: async (request) => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('Conversation service not available — plugin has not started');
        }
        return services.conversations.getScopedClient({ request });
      },
      getAgentRegistry: async (request) => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('Agents service not available — plugin has not started');
        }
        return services.agents.getRegistry({ request });
      },
      isExperimentalEnabled: this.isExperimentalEnabled,
    });

    registerAttachmentWorkflowSteps(setupDeps.workflowsExtensions, {
      getAttachmentClient: async (request) => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('Attachment client not available — plugin has not started');
        }
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        return createAttachmentPublicClient({
          request,
          conversationsService: services.conversations,
          attachmentsService: services.attachments,
          coreStart,
          spaces: startDeps.spaces,
        });
      },
      isExperimentalEnabled: this.isExperimentalEnabled,
    });

    registerAgentBuilderHandlerContext({ coreSetup });

    const getInternalServices = () => {
      const services = this.serviceManager.internalStart;
      if (!services) {
        throw new Error('getInternalServices called before service init');
      }
      return services;
    };

    const router = coreSetup.http.createRouter<AgentBuilderHandlerContext>();
    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      pluginsSetup: setupDeps,
      getInternalServices,
      trackingService: this.trackingService,
      analyticsService: this.analyticsService,
    });

    registerBeforeAgentWorkflowsHook(serviceSetups, {
      workflowsManagement: setupDeps.workflowsManagement,
      logger: this.logger,
      getInternalServices,
    });

    registerAfterExecutionWorkflowsHook(serviceSetups, {
      workflowsManagement: setupDeps.workflowsManagement,
      logger: this.logger,
      getInternalServices,
    });

    registerSkillToolsLoaderHook(serviceSetups, {
      analyticsService: this.analyticsService,
      trackingService: this.trackingService,
    });

    const smlTools = createSmlTools({
      getAgentBuilderSml: () => {
        if (!this.startDeps) {
          throw new Error('Agent Builder SML not available — plugin has not started');
        }
        return this.startDeps.agentBuilderSml;
      },
    });
    smlTools.forEach((tool) => {
      serviceSetups.tools.register(tool);
    });

    const connectorTools = createConnectorTools({
      getActions: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.actions;
      },
      getInference: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.inference;
      },
    });
    connectorTools.forEach((tool) => {
      serviceSetups.tools.register(tool);
    });

    // Built-in Deductive AI agent: registered for every user, but its availability is
    // gated on the `agentBuilder:deductiveEnabled` Advanced Setting (which admins turn on
    // together with the per-deployment feature flag). When disabled, the agent disappears
    // from the agents list for everyone.
    serviceSetups.agents.register({
      id: DEDUCTIVE_AGENT_ID,
      name: 'Deductive AI Agent',
      description:
        'Routes execution to the external Deductive AI backend. Requires the Deductive AI ' +
        'Advanced Settings (endpoint + API key) on this deployment.',
      avatar_symbol: '',
      avatar_color: '#111113',
      avatar_icon: DEDUCTIVE_AVATAR_ICON,
      availability: {
        cacheMode: 'space',
        handler: async ({ request, uiSettings }) => {
          // Availability must honor the GLOBAL (deployment-wide) setting too, so an admin
          // configures `agentBuilder:deductiveEnabled` once and every user sees the agent —
          // and the per-deployment feature flag, so flipping it off removes the agent
          // entirely (settings stop having any effect).
          const [coreStart] = await coreSetup.getStartServices().catch(() => [undefined]);
          const flagEnabled = await coreStart?.featureFlags
            ?.getBooleanValue(DEDUCTIVE_ENABLED_FLAG, false)
            .catch(() => false);
          if (!flagEnabled) {
            return {
              status: 'unavailable',
              reason: 'Deductive AI is not enabled for this deployment',
            };
          }
          const globalClient = coreStart?.uiSettings?.globalAsScopedToClient(
            coreStart.savedObjects.getScopedClient(request)
          );
          const read = async (client: typeof uiSettings | undefined) =>
            client?.get<boolean>(AGENT_BUILDER_DEDUCTIVE_ENABLED_SETTING_ID).catch(() => false) ??
            false;
          const userEnabled = await read(uiSettings);
          const globalEnabled = globalClient ? await read(globalClient) : false;
          const enabled = userEnabled || globalEnabled;
          return enabled
            ? { status: 'available' }
            : { status: 'unavailable', reason: 'Deductive AI agent is disabled' };
        },
      },
      configuration: {
        instructions: 'You are powered by Deductive AI.',
        tools: [],
        connector_ids: [],
        enable_elastic_capabilities: false,
      },
    });

    return {
      tools: {
        register: serviceSetups.tools.register.bind(serviceSetups.tools),
      },
      agents: {
        register: serviceSetups.agents.register.bind(serviceSetups.agents),
        registerType: serviceSetups.agents.registerType.bind(serviceSetups.agents),
        registerAiIndexResolver: serviceSetups.agents.registerAiIndexResolver.bind(
          serviceSetups.agents
        ),
      },
      attachments: {
        registerType: serviceSetups.attachments.registerType.bind(serviceSetups.attachments),
      },
      renderers: {
        register: serviceSetups.renderers.register.bind(serviceSetups.renderers),
      },
      hooks: {
        register: serviceSetups.hooks.register.bind(serviceSetups.hooks),
      },
      skills: {
        register: serviceSetups.skills.registerSkill.bind(serviceSetups.skills),
      },
      plugins: {
        register: serviceSetups.plugins.register.bind(serviceSetups.plugins),
      },
      conversationTemplates: {
        register: serviceSetups.conversationTemplates.register.bind(
          serviceSetups.conversationTemplates
        ),
      },
      topSnippets: this.config.topSnippets,
    };
  }

  start(coreStart: CoreStart, startDeps: AgentBuilderStartDependencies): AgentBuilderPluginStart {
    this.startDeps = startDeps;
    void registerTracingExporter({
      core: coreStart,
      tracingConfig: this.config.tracing,
      logger: this.logger.get('tracing'),
    }).then((teardownTracing) => {
      this.teardownTracing = teardownTracing;
    });
    const {
      inference,
      spaces,
      actions,
      taskManager,
      searchInferenceEndpoints,
      security: securityPlugin,
    } = startDeps;
    const { elasticsearch, http, security, uiSettings, savedObjects, dataStreams, featureFlags } =
      coreStart;

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
      dataStreams,
      taskManager,
      trackingService: this.trackingService,
      analyticsService: this.analyticsService,
      searchInferenceEndpoints,
      conversationEventBus: this.conversationEventBus,
    });

    registerConversationWorkflowEventBridge(
      this.conversationEventBus,
      startDeps.workflowsExtensions,
      this.logger,
      this.isExperimentalEnabled!
    );

    const {
      tools,
      agents,
      skills,
      runnerFactory,
      execution,
      plugins,
      conversations,
      conversationTemplates,
      attachments,
    } = startServices;
    const runner = runnerFactory.getRunner();

    if (this.home) {
      registerSampleData(this.home, this.logger);
    }

    const modelProviderFactory = createModelProviderFactory({
      inference,
      uiSettings,
      savedObjects,
      trackingService: this.trackingService,
      searchInferenceEndpoints,
      logger: this.logger.get('model-provider'),
    });

    this.recommendedEndpointsPoller = new RecommendedEndpointsPoller({
      logger: this.logger.get('recommended-endpoints-poller'),
      esClient: elasticsearch.client.asInternalUser,
      features: searchInferenceEndpoints.features,
    });
    this.recommendedEndpointsPoller.start();

    return {
      agents: {
        getRegistry: ({ request }) => agents.getRegistry({ request }),
        ensure: agents.ensure,
        runAgent: runner.runAgent.bind(runner),
      },
      tools: {
        getRegistry: ({ request }) => tools.getRegistry({ request }),
        execute: runner.runTool.bind(runner),
      },
      skills: {
        getRegistry: skills.getRegistry.bind(skills),
        register: skills.registerSkill.bind(skills),
      },
      plugins: {
        getRegistry: ({ request }) => plugins.getRegistry({ request }),
      },
      execution: {
        executeAgent: execution.executeAgent.bind(execution),
        getExecution: execution.getExecution.bind(execution),
        findExecutions: execution.findExecutions.bind(execution),
      },
      runtime: {
        createModelProvider: modelProviderFactory,
      },
      conversations: {
        getScopedClient: async ({ request }) => {
          const client = await conversations.getScopedClient({ request });
          const agentRegistry = await agents.getRegistry({ request });
          return createConversationPublicClient({ client, agentRegistry });
        },
      },
      attachments: {
        getScopedClient: async ({ request }) =>
          createAttachmentPublicClient({
            request,
            conversationsService: conversations,
            attachmentsService: attachments,
            coreStart,
            spaces,
          }),
      },
      conversationTemplates,
    };
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
