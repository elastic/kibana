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
import { getRunAgentStepDefinition } from './step_types';
import type { AgentBuilderHandlerContext } from './request_handler_context';
import { registerAgentBuilderHandlerContext } from './request_handler_context';
import { createAgentBuilderUsageCounter } from './telemetry/usage_counters';
import { TrackingService } from './telemetry/tracking_service';
import { registerTelemetryCollector } from './telemetry/telemetry_collector';
import { AnalyticsService } from './telemetry';
import { registerSampleData } from './register_sample_data';
import { registerBeforeAgentWorkflowsHook } from './hooks/agent_workflows/register_before_agent_workflows_hook';
import { registerSkillToolsLoaderHook } from './hooks/skills/register_skill_tools_loader_hook';
import { createConnectorLifecycleHandler } from './services/connector_lifecycle/connector_lifecycle_handler';
import { registerTaskDefinitions } from './services/execution';
import { createModelProviderFactory } from './services/runner/model_provider';
import { registerSmlCrawlerTaskDefinition, scheduleSmlCrawlerTasks } from './services/sml';
import { createSmlTools } from './services/tools/builtin/sml';
import { createAdminPrivilegeSwitcher } from './capabilities/admin_privilege_switcher';

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

    // Register SML crawler task definition
    registerSmlCrawlerTaskDefinition({
      taskManager: setupDeps.taskManager,
      getCrawlerDeps: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('getCrawlerDeps called before service init');
        }
        return {
          smlService: services.sml,
          elasticsearch: coreStart.elasticsearch,
          savedObjects: coreStart.savedObjects,
          uiSettings: coreStart.uiSettings,
          logger: this.logger.get('services.sml'),
        };
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

    setupDeps.workflowsExtensions.registerStepDefinition(
      getRunAgentStepDefinition(this.serviceManager)
    );

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

    registerSkillToolsLoaderHook(serviceSetups);

    const smlTools = createSmlTools({
      getSmlService: () => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('SML service not available — plugin has not started');
        }
        return services.sml;
      },
    });
    smlTools.forEach((tool) => {
      serviceSetups.tools.register(tool);
    });

    // Register connector lifecycle listener to auto-create workflows/tools
    // when connectors with workflow definitions are created.
    // The handler checks the connectors-enabled feature flag and workflows
    // availability at runtime, so we always register.
    const connectorLifecycleHandler = createConnectorLifecycleHandler({
      serviceManager: this.serviceManager,
      workflowsManagement: setupDeps.workflowsManagement,
      logger: this.logger.get('connector-lifecycle'),
      getStartServices: coreSetup.getStartServices,
    });

    setupDeps.actions.registerConnectorLifecycleListener({
      connectorTypes: '*',
      onPostCreate: connectorLifecycleHandler.onPostCreate,
      onPostDelete: connectorLifecycleHandler.onPostDelete,
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
      hooks: {
        register: serviceSetups.hooks.register.bind(serviceSetups.hooks),
      },
      skills: {
        register: serviceSetups.skills.registerSkill.bind(serviceSetups.skills),
      },
      sml: {
        registerType: serviceSetups.sml.registerType.bind(serviceSetups.sml),
      },
    };
  }

  start(
    coreStart: CoreStart,
    { inference, spaces, actions, taskManager }: AgentBuilderStartDependencies
  ): AgentBuilderPluginStart {
    const { elasticsearch, security, uiSettings, savedObjects, dataStreams, featureFlags } =
      coreStart;
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
    });

    const { tools, agents, skills, runnerFactory, execution } = startServices;
    const runner = runnerFactory.getRunner();

    if (this.home) {
      registerSampleData(this.home, this.logger);
    }

    const modelProviderFactory = createModelProviderFactory({
      inference,
      uiSettings,
      savedObjects,
      trackingService: this.trackingService,
    });

    // Schedule SML crawler tasks for all registered types
    scheduleSmlCrawlerTasks({
      taskManager,
      smlService: startServices.sml,
      logger: this.logger.get('services.sml'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule SML crawler tasks: ${error.message}`);
    });

    const smlService = startServices.sml;

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
      execution: {
        executeAgent: execution.executeAgent.bind(execution),
        getExecution: execution.getExecution.bind(execution),
        findExecutions: execution.findExecutions.bind(execution),
      },
      runtime: {
        createModelProvider: modelProviderFactory,
      },
      sml: {
        indexAttachment: async (params) => {
          const soClient = savedObjects.getScopedClient(params.request);
          const spaceId =
            params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
          return smlService.indexAttachment({
            originId: params.originId,
            attachmentType: params.attachmentType,
            action: params.action,
            spaces: [spaceId],
            esClient: elasticsearch.client.asInternalUser,
            savedObjectsClient: soClient,
            logger: this.logger.get('services.sml'),
          });
        },
      },
    };
  }

  stop() {}
}
