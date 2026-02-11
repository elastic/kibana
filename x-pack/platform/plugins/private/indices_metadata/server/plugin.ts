/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import {
  type CoreSetup,
  type CoreStart,
  type PluginInitializerContext,
  type Plugin,
} from '@kbn/core/server';
import type { Logger, LogMeta } from '@kbn/core/server';
import { IndicesMetadataService } from './lib/services/indices_metadata';
import { registerEbtEvents } from './lib/ebt/events';
import type {
  IndicesMetadataPluginSetup,
  IndicesMetadataPluginStart,
  IndicesMetadataPluginSetupDeps,
  IndicesMetadataPluginStartDeps,
} from './plugin.types';
import { DEFAULT_CDN_CONFIG, DEFAULT_INDICES_METADATA_CONFIGURATION } from './lib/constants';
import type { PluginConfig } from './config';
import type { CdnConfig } from './lib/services/artifact.types';
import { ArtifactService } from './lib/services/artifact';
import { ConfigurationService } from './lib/services/configuration';
import { TelemetryConfigProvider } from './lib/services/telemetry_config_provider';

export class IndicesMetadataPlugin
  implements
    Plugin<
      IndicesMetadataPluginSetup,
      IndicesMetadataPluginStart,
      IndicesMetadataPluginSetupDeps,
      IndicesMetadataPluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly config$: Observable<PluginConfig>;

  private readonly indicesMetadataService: IndicesMetadataService;
  private readonly configurationService: ConfigurationService;
  private readonly telemetryConfigProvider: TelemetryConfigProvider;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config$ = context.config.create<PluginConfig>();

    this.configurationService = new ConfigurationService(this.logger);
    this.indicesMetadataService = new IndicesMetadataService(
      this.logger,
      this.configurationService
    );
    this.telemetryConfigProvider = new TelemetryConfigProvider();
  }

  public setup(core: CoreSetup, plugin: IndicesMetadataPluginSetupDeps) {
    const { taskManager } = plugin;

    this.indicesMetadataService.setup(taskManager);

    registerEbtEvents(core.analytics);
  }

  public start(core: CoreStart, plugin: IndicesMetadataPluginStartDeps) {
    this.logger.debug('Starting indices metadata plugin');
    const isServerless = this.context.env.packageInfo.buildFlavor === 'serverless';
    this.telemetryConfigProvider.start(plugin.telemetry.isOptedIn$);
    this.config$.subscribe(async (pluginConfig) => {
      this.logger.debug('PluginConfig changed', { pluginConfig } as LogMeta);

      if (pluginConfig.enabled) {
        this.logger.info('Updating indices metadata configuration');

        const cdnConfig = this.effectiveCdnConfig(pluginConfig);
        const info = await core.elasticsearch.client.asInternalUser.info();
        const artifactService = new ArtifactService(this.logger, info, cdnConfig);

        this.configurationService.start(
          artifactService,
          DEFAULT_INDICES_METADATA_CONFIGURATION,
          this.telemetryConfigProvider
        );
        this.indicesMetadataService.start(
          plugin.taskManager,
          core.analytics,
          core.elasticsearch.client.asInternalUser,
          isServerless,
          this.telemetryConfigProvider
        );
      } else {
        this.logger.info('Indices metadata plugin is disabled, stopping services');
        this.configurationService.stop();
        this.indicesMetadataService.stop();
      }
    });
  }

  public stop() {
    this.logger.debug('Stopping indices metadata plugin');
    this.indicesMetadataService.stop();
    this.configurationService.stop();
  }

  private effectiveCdnConfig({ cdn }: PluginConfig): CdnConfig {
    return {
      url: cdn?.url ?? DEFAULT_CDN_CONFIG.url,
      pubKey: cdn?.publicKey ?? DEFAULT_CDN_CONFIG.pubKey,
      requestTimeout: cdn?.requestTimeout ?? DEFAULT_CDN_CONFIG.requestTimeout,
    };
  }
}
