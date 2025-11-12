/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { OnechatConfig } from './config';
import { ServiceManager } from './services';
import type { InternalStartServices } from './services/types';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerRoutes } from './routes';
import { registerUISettings } from './ui_settings';
import type { OnechatHandlerContext } from './request_handler_context';
import { registerOnechatHandlerContext } from './request_handler_context';
import { createOnechatUsageCounter } from './telemetry/usage_counters';
import { TrackingService } from './telemetry/tracking_service';
import { registerTelemetryCollector } from './telemetry/telemetry_collector';

export class OnechatPlugin
  implements
    Plugin<
      OnechatPluginSetup,
      OnechatPluginStart,
      OnechatSetupDependencies,
      OnechatStartDependencies
    >
{
  private logger: Logger;
  // @ts-expect-error unused for now
  private config: OnechatConfig;
  private serviceManager = new ServiceManager();
  private usageCounter?: UsageCounter;
  private trackingService?: TrackingService;
  private startServicesPromise?: Promise<InternalStartServices>;
  private startServicesResult?: InternalStartServices;
  private startServicesError?: Error;

  /**
   * Gets the initialized services, awaiting initialization if necessary.
   * Caches the result to avoid re-awaiting on subsequent calls.
   */
  private async getStartServices(): Promise<InternalStartServices> {
    if (!this.startServicesPromise) {
      throw new Error('Onechat plugin services not initialized. start() must be called first.');
    }

    // Return cached result if available
    if (this.startServicesResult) {
      return this.startServicesResult;
    }

    // Throw cached error if initialization failed
    if (this.startServicesError) {
      throw this.startServicesError;
    }

    // Await initialization (first call or in-progress)
    return await this.startServicesPromise;
  }

  constructor(context: PluginInitializerContext<OnechatConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    setupDeps: OnechatSetupDependencies
  ): OnechatPluginSetup {
    // Create usage counter for telemetry (if usageCollection is available)
    if (setupDeps.usageCollection) {
      this.usageCounter = createOnechatUsageCounter(setupDeps.usageCollection);
      if (this.usageCounter) {
        this.trackingService = new TrackingService(this.usageCounter, this.logger.get('telemetry'));
        registerTelemetryCollector(setupDeps.usageCollection, this.logger.get('telemetry'));
      }

      this.logger.info('Onechat telemetry initialized');
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

    registerOnechatHandlerContext({ coreSetup });

    const router = coreSetup.http.createRouter<OnechatHandlerContext>();
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
    { inference, spaces, llmTasks }: OnechatStartDependencies
  ): OnechatPluginStart {
    // Start async initialization. The Plugin interface requires start() to be synchronous,
    // so we initialize services asynchronously and await them when methods are called.
    // Errors during initialization (like product documentation availability checks) are
    // handled gracefully and won't block plugin functionality.
    this.startServicesPromise = this.serviceManager
      .startServices({
        logger: this.logger.get('services'),
        security,
        elasticsearch,
        inference,
        spaces,
        uiSettings,
        savedObjects,
        llmTasks,
        trackingService: this.trackingService,
      })
      .then(
        (result) => {
          this.startServicesResult = result;
          return result;
        },
        (error) => {
          // Only store critical errors that prevent the plugin from functioning.
          // Non-critical errors (like product documentation availability) are already
          // handled within the service initialization and won't reach here.
          this.startServicesError = error instanceof Error ? error : new Error(String(error));
          this.logger.error('Failed to initialize onechat services. Plugin will be unavailable until initialization succeeds.', error);
          return Promise.reject(this.startServicesError);
        }
      );

    return {
      tools: {
        getRegistry: async ({ request }) => {
          const services = await this.getStartServices();
          return services.tools.getRegistry({ request });
        },
        execute: async (params) => {
          const services = await this.getStartServices();
          const runner = services.runnerFactory.getRunner();
          return runner.runTool(params);
        },
      },
    };
  }

  stop() {}
}
