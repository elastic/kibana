/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
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
import type { AgentBuilderHandlerContext } from './request_handler_context';
import { registerAgentBuilderHandlerContext } from './request_handler_context';
import { createAgentBuilderUsageCounter } from './telemetry/usage_counters';
import { TrackingService } from './telemetry/tracking_service';
import { registerTelemetryCollector } from './telemetry/telemetry_collector';
import { registerBuiltinTools } from './services/tools';

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

  constructor(context: PluginInitializerContext<AgentBuilderConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>,
    setupDeps: AgentBuilderSetupDependencies
  ): AgentBuilderPluginSetup {
    // Create usage counter for telemetry (if usageCollection is available)
    if (setupDeps.usageCollection) {
      this.usageCounter = createAgentBuilderUsageCounter(setupDeps.usageCollection);
      if (this.usageCounter) {
        this.trackingService = new TrackingService(this.usageCounter, this.logger.get('telemetry'));
        registerTelemetryCollector(setupDeps.usageCollection, this.logger.get('telemetry'));
      }

      this.logger.info('Agent Builder telemetry initialized');
    } else {
      this.logger.warn('Usage collection plugin not available, telemetry disabled');
    }

    const serviceSetups = this.serviceManager.setupServices({
      logger: this.logger.get('services'),
      workflowsManagement: setupDeps.workflowsManagement,
      trackingService: this.trackingService,
    });

    registerFeatures({ features: setupDeps.features });

    registerUISettings({ uiSettings: coreSetup.uiSettings });

    registerAgentBuilderHandlerContext({ coreSetup });

    registerBuiltinTools({
      registry: serviceSetups.tools,
      coreSetup,
      setupDeps,
    });

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
    };
  }

  start(
    { elasticsearch, security, uiSettings, savedObjects }: CoreStart,
    { inference, spaces }: AgentBuilderStartDependencies
  ): AgentBuilderPluginStart {
    const startServices = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security,
      elasticsearch,
      inference,
      spaces,
      uiSettings,
      savedObjects,
      trackingService: this.trackingService,
    });

    const { tools, runnerFactory } = startServices;
    const runner = runnerFactory.getRunner();

    return {
      tools: {
        getRegistry: ({ request }) => tools.getRegistry({ request }),
        execute: runner.runTool.bind(runner),
      },
    };
  }

  stop() {}
}
