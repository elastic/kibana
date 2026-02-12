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
import { registerTaskDefinitions } from './services/execution';

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
  // @ts-expect-error unused for now
  private config: AgentBuilderConfig;
  private serviceManager = new ServiceManager();
  private usageCounter?: UsageCounter;
  private trackingService?: TrackingService;
  private analyticsService?: AnalyticsService;
  private home: HomeServerPluginSetup | null = null;
  constructor(context: PluginInitializerContext<AgentBuilderConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
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

    registerUISettings({ uiSettings: coreSetup.uiSettings });

    setupDeps.workflowsExtensions.registerStepDefinition(
      getRunAgentStepDefinition(this.serviceManager)
    );

    registerAgentBuilderHandlerContext({ coreSetup });

    const router = coreSetup.http.createRouter<AgentBuilderHandlerContext>();
    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      pluginsSetup: setupDeps,
      getInternalServices: () => {
        const services = this.serviceManager.internalStart;
        if (!services) {
          throw new Error('getInternalServices called before service init');
        }
        return services;
      },
      trackingService: this.trackingService,
      analyticsService: this.analyticsService,
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
    };
  }

  start(
    { elasticsearch, security, uiSettings, savedObjects, dataStreams }: CoreStart,
    { inference, spaces, actions, taskManager }: AgentBuilderStartDependencies
  ): AgentBuilderPluginStart {
    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      elasticsearch,
      inference,
      spaces,
      actions,
      uiSettings,
      savedObjects,
      dataStreams,
      taskManager,
      trackingService: this.trackingService,
      analyticsService: this.analyticsService,
    });

    const { tools, agents, runnerFactory } = startServices;
    const runner = runnerFactory.getRunner();

    if (this.home) {
      registerSampleData(this.home, this.logger);
    }
    return {
      agents: {
        runAgent: agents.execute.bind(agents),
      },
      tools: {
        getRegistry: ({ request }) => tools.getRegistry({ request }),
        execute: runner.runTool.bind(runner),
      },
    };
  }

  stop() {}
}
