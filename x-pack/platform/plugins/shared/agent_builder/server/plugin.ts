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
import { registerUISettings } from './ui_settings';
import { getRunAgentStepDefinition, rerankStepDefinition } from './step_types';
import type { AgentBuilderHandlerContext } from './request_handler_context';
import { registerAgentBuilderHandlerContext } from './request_handler_context';
import { createAgentBuilderUsageCounter } from './telemetry/usage_counters';
import { TrackingService } from './telemetry/tracking_service';
import { registerTelemetryCollector } from './telemetry/telemetry_collector';
import { AnalyticsService } from './telemetry';
import { registerSampleData } from './register_sample_data';
import { registerBeforeAgentWorkflowsHook } from './hooks/agent_workflows/register_before_agent_workflows_hook';
import { registerSkillToolsLoaderHook } from './hooks/skills/register_skill_tools_loader_hook';
import { registerTaskDefinitions } from './services/execution';
import { createModelProviderFactory } from './services/execution/runner/model_provider';
import { createSmlTools } from './services/tools/builtin/sml';
import { createConnectorTools } from './services/tools/builtin/connectors';
import { createAdminPrivilegeSwitcher } from './capabilities/admin_privilege_switcher';
import { registerInferenceFeatures } from './inference_features';
import {
  initOpencodeSubagentExecutor,
  stopOpencodeSubagentExecutor,
} from './services/execution/opencode_subagent';
import {
  sandboxProfileSavedObjectType,
  SANDBOX_PROFILE_SO_TYPE,
  SANDBOX_PROFILE_ATTRIBUTES_IN_AAD,
  SANDBOX_PROFILE_ATTRIBUTES_TO_ENCRYPT,
} from './services/sandboxes/saved_object';
import { initSandboxProfileProvider } from './services/sandboxes';

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
  private canEncryptSandboxProfiles = false;
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

    // Sandbox Profiles are stored as Encrypted Saved Objects (secrets encrypted at
    // rest). Local Kubernetes has no secret, but the field is encrypted from day
    // one so secret-bearing providers can be added without an unsupported
    // unencrypted->encrypted migration.
    coreSetup.savedObjects.registerType(sandboxProfileSavedObjectType);
    setupDeps.encryptedSavedObjects.registerType({
      type: SANDBOX_PROFILE_SO_TYPE,
      attributesToEncrypt: new Set(SANDBOX_PROFILE_ATTRIBUTES_TO_ENCRYPT),
      attributesToIncludeInAAD: new Set(SANDBOX_PROFILE_ATTRIBUTES_IN_AAD),
    });
    this.canEncryptSandboxProfiles = setupDeps.encryptedSavedObjects.canEncrypt;

    setupDeps.workflowsExtensions.registerStepDefinition(
      getRunAgentStepDefinition(this.serviceManager)
    );
    setupDeps.workflowsExtensions.registerStepDefinition(rerankStepDefinition);

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

    registerSkillToolsLoaderHook(serviceSetups, {
      analyticsService: this.analyticsService,
      trackingService: this.trackingService,
    });

    const smlTools = createSmlTools({
      getAgentContextLayer: () => {
        if (!this.startDeps) {
          throw new Error('Agent Context Layer not available — plugin has not started');
        }
        return this.startDeps.agentContextLayer;
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
    });
    connectorTools.forEach((tool) => {
      serviceSetups.tools.register(tool);
    });

    return {
      tools: {
        register: serviceSetups.tools.register.bind(serviceSetups.tools),
      },
      agents: {
        register: serviceSetups.agents.register.bind(serviceSetups.agents),
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
    const { inference, spaces, actions, taskManager, searchInferenceEndpoints } = startDeps;
    const { elasticsearch, security, uiSettings, savedObjects, dataStreams, featureFlags } =
      coreStart;

    this.cleanupLegacySmlTasks(taskManager).catch((error) => {
      this.logger.warn(`Failed to clean up legacy SML tasks: ${(error as Error).message}`);
    });

    // Experimental OpenCode coding sub-agent executor. The tool itself is only
    // registered when the opencodeSubagent UI setting is on; initializing the
    // executor here is cheap and side-effect-free until invoked.
    initOpencodeSubagentExecutor({
      config: this.config.opencodeSubagent,
      logger: this.logger.get('opencodeSubagent'),
      esClient: elasticsearch.client.asInternalUser,
      security,
      getActions: async () => actions,
    });

    // Request-scoped Sandbox Profile CRUD (Encrypted Saved Objects). Cheap to
    // initialize; only used by the Sandboxes management page + agent attach.
    initSandboxProfileProvider({
      core: coreStart,
      encryptedSavedObjects: startDeps.encryptedSavedObjects,
      canEncrypt: this.canEncryptSandboxProfiles,
      logger: this.logger.get('sandboxProfiles'),
    });

    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      elasticsearch,
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
    });

    const { tools, agents, skills, runnerFactory, execution, plugins, conversations } =
      startServices;
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

    return {
      agents: {
        getRegistry: ({ request }) => agents.getRegistry({ request }),
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
          return {
            get: client.get.bind(client),
            list: client.list.bind(client),
          };
        },
      },
    };
  }

  async stop() {
    await stopOpencodeSubagentExecutor();
    await this.teardownTracing?.();
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
