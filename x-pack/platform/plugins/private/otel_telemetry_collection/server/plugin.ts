/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { registerOtelEbtEvents } from './lib/ebt/events';
import { OtelTelemetryService } from './lib/services/otel_telemetry';
import { TelemetryConfigProvider } from './lib/services/telemetry_config_provider';
import { ConfigurationService } from './lib/services/configuration';
import { ArtifactService } from './lib/services/artifact';
import { DEFAULT_CDN_CONFIG, DEFAULT_OTEL_TELEMETRY_CONFIGURATION } from './lib/constants';
import type { CdnConfig } from './lib/constants';
import type { PluginConfig } from './config';
import type {
  OtelTelemetryCollectionPluginSetup,
  OtelTelemetryCollectionPluginStart,
  OtelTelemetryCollectionPluginSetupDeps,
  OtelTelemetryCollectionPluginStartDeps,
} from './plugin.types';

export class OtelTelemetryCollectionPlugin
  implements
    Plugin<
      OtelTelemetryCollectionPluginSetup,
      OtelTelemetryCollectionPluginStart,
      OtelTelemetryCollectionPluginSetupDeps,
      OtelTelemetryCollectionPluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly pluginConfig: PluginConfig;

  private readonly otelTelemetryService: OtelTelemetryService;
  private readonly configurationService: ConfigurationService;
  private readonly telemetryConfigProvider: TelemetryConfigProvider;

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
    this.pluginConfig = context.config.get();

    this.configurationService = new ConfigurationService(this.logger);
    this.otelTelemetryService = new OtelTelemetryService(this.logger, this.configurationService);
    this.telemetryConfigProvider = new TelemetryConfigProvider();
  }

  public setup(core: CoreSetup, plugins: OtelTelemetryCollectionPluginSetupDeps) {
    this.logger.debug('Setting up OTel telemetry collection plugin');

    registerOtelEbtEvents(core.analytics);

    if (!this.pluginConfig.enabled) {
      this.logger.info('OTel telemetry collection plugin is disabled via config');
      return;
    }

    this.otelTelemetryService.setup(plugins.taskManager);
  }

  public start(core: CoreStart, plugins: OtelTelemetryCollectionPluginStartDeps) {
    this.logger.debug('Starting OTel telemetry collection plugin');

    if (plugins.telemetry) {
      this.telemetryConfigProvider.start(plugins.telemetry.isOptedIn$);
    }

    if (!this.pluginConfig.enabled) {
      return;
    }

    const cdnConfig = this.effectiveCdnConfig(this.pluginConfig);

    // Bootstrap asynchronously so we don't block Kibana's start lifecycle on
    // Elasticsearch availability (e.g. OAS snapshot capture starts Kibana
    // without a backing ES cluster).
    void (async () => {
      try {
        const info = await core.elasticsearch.client.asInternalUser.info();
        const artifactService = new ArtifactService(this.logger, info, cdnConfig);

        this.configurationService.start(
          artifactService,
          DEFAULT_OTEL_TELEMETRY_CONFIGURATION,
          this.telemetryConfigProvider
        );

        this.otelTelemetryService.start(
          plugins.taskManager,
          core.analytics,
          core.elasticsearch.client.asInternalUser,
          this.telemetryConfigProvider
        );
      } catch (error) {
        this.logger.error('Failed to bootstrap OTel telemetry collection', { error });
      }
    })();
  }

  public stop() {
    this.logger.debug('Stopping OTel telemetry collection plugin');
    this.otelTelemetryService.stop();
    this.configurationService.stop();
    this.telemetryConfigProvider.stop();
  }

  private effectiveCdnConfig({ cdn }: PluginConfig): CdnConfig {
    return {
      url: cdn?.url ?? DEFAULT_CDN_CONFIG.url,
      pubKey: cdn?.publicKey ?? DEFAULT_CDN_CONFIG.pubKey,
      requestTimeout: cdn?.requestTimeout ?? DEFAULT_CDN_CONFIG.requestTimeout,
    };
  }
}
