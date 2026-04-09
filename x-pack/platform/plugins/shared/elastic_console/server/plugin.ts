/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ElasticConsolePluginSetup,
  ElasticConsolePluginStart,
  ElasticConsoleSetupDependencies,
  ElasticConsoleStartDependencies,
} from './types';
import { registerUiSettings } from './ui_settings';
import { registerRoutes } from './routes';
import { installLlmGatewayDashboardIfMissing } from './dashboard/install_llm_gateway_dashboard';
import {
  createLlmGatewayTelemetryWriter,
  registerLlmGatewayTelemetryDataStream,
} from './telemetry/llm_gateway_telemetry';

export class ElasticConsolePlugin
  implements
    Plugin<
      ElasticConsolePluginSetup,
      ElasticConsolePluginStart,
      ElasticConsoleSetupDependencies,
      ElasticConsoleStartDependencies
    >
{
  private logger: Logger;
  private llmGatewayTelemetryObserved = false;
  private llmGatewayDashboardInstall: Promise<void> | undefined;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>,
    setupDeps: ElasticConsoleSetupDependencies
  ): ElasticConsolePluginSetup {
    registerUiSettings(coreSetup);
    registerLlmGatewayTelemetryDataStream(coreSetup.dataStreams);

    const pluginThis = this;
    const writeLlmGatewayTelemetry = createLlmGatewayTelemetryWriter({
      logger: this.logger,
      coreSetup,
      onFirstGatewayUse: () => {
        pluginThis.onFirstLlmGatewayTelemetryObservation(coreSetup);
      },
    });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      cloud: setupDeps.cloud,
      writeLlmGatewayTelemetry,
    });

    return {};
  }

  start(_core: CoreStart): ElasticConsolePluginStart {
    return {};
  }

  stop() {}

  /**
   * First Ramen LLM gateway traffic: kick off a one-time background check/install for the telemetry dashboard.
   */
  private onFirstLlmGatewayTelemetryObservation(
    coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>
  ): void {
    if (this.llmGatewayTelemetryObserved) {
      return;
    }
    this.llmGatewayTelemetryObserved = true;

    if (!this.llmGatewayDashboardInstall) {
      this.llmGatewayDashboardInstall = coreSetup
        .getStartServices()
        .then(([coreStart]) => installLlmGatewayDashboardIfMissing(coreStart, this.logger));
    }
  }
}
