/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  type CoreSetup,
  type CoreStart,
  type PluginInitializerContext,
  type Plugin,
} from '@kbn/core/server';
import type { Logger, LogMeta } from '@kbn/core/server';
import { IndicesMetadataService } from './lib/services/indices_metadata';
import { registerEbtEvents } from './lib/ebt/events';
import { MetadataReceiver } from './lib/services/receiver';
import { MetadataSender } from './lib/services/sender';
import type {
  IndicesMetadataPluginSetup,
  IndicesMetadataPluginStart,
  IndicesMetadataPluginSetupDeps,
  IndicesMetadataPluginStartDeps,
} from './plugin.types';
import { DEFAULT_CDN_CONFIG, DEFAULT_INDICES_METADATA_CONFIGURATION } from './lib/constants';
import { PluginConfig } from './config';
import { CdnConfig } from './lib/services/artifact.types';
import { ArtifactService } from './lib/services/artifact';
import { ConfigurationService } from './lib/services/configuration';

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
  private readonly receiver: MetadataReceiver;
  private readonly sender: MetadataSender;
  private readonly artifactService: ArtifactService;
  private readonly configurationService: ConfigurationService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config$ = context.config.create<PluginConfig>();

    this.receiver = new MetadataReceiver(this.logger);
    this.sender = new MetadataSender(this.logger);
    this.artifactService = new ArtifactService(this.logger);
    this.configurationService = new ConfigurationService(this.logger, this.artifactService);

    this.indicesMetadataService = new IndicesMetadataService(
      this.logger,
      this.sender,
      this.receiver,
      this.configurationService,
      DEFAULT_INDICES_METADATA_CONFIGURATION
    );
  }

  public setup(core: CoreSetup, plugin: IndicesMetadataPluginSetupDeps) {
    const { taskManager } = plugin;

    this.indicesMetadataService.setup(taskManager);

    registerEbtEvents(core.analytics);
  }

  public start(core: CoreStart, plugin: IndicesMetadataPluginStartDeps) {
    this.logger.debug('Starting indices metadata plugin');

    this.config$.subscribe(async (pluginConfig) => {
      this.logger.debug('PluginConfig changed', { pluginConfig } as LogMeta);

      const info = await core.elasticsearch.client.asInternalUser.info();

      this.sender.start(core.analytics);
      this.receiver.start(core.elasticsearch.client.asInternalUser);
      this.configurationService.start();
      this.artifactService.start(info, this.effectiveCdnConfig(pluginConfig));
      this.indicesMetadataService.start(plugin.taskManager);
    });
  }

  public stop() {
    this.logger.debug('Stopping indices metadata plugin');
    this.indicesMetadataService.stop();
    this.configurationService.stop();
  }

  private effectiveCdnConfig({ cdnUrl, publicKey }: PluginConfig): CdnConfig {
    return {
      url: cdnUrl ?? DEFAULT_CDN_CONFIG.url,
      pubKey: publicKey ?? DEFAULT_CDN_CONFIG.pubKey,
      requestTimeout: DEFAULT_CDN_CONFIG.requestTimeout,
    };
  }
}
