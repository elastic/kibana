/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import { IndicesMetadataService } from './lib/indices_metadata_service';
import { registerEbtEvents } from './lib/ebt/events';
import { MetadataReceiver } from './lib/receiver';
import { MetadataSender } from './lib/sender';
import type { IndicesMetadataPluginSetup, IndicesMetadataPluginStart } from './lib/plugin.types';
import type { IMetadataReceiver } from './lib/receiver.types';
import type { IMetadataSender } from './lib/sender.types';

export class IndicesMetadataPlugin {
  private readonly logger: Logger;
  private readonly indicesMetadataService: IndicesMetadataService;
  private readonly receiver: IMetadataReceiver;
  private readonly sender: IMetadataSender;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.receiver = new MetadataReceiver(this.logger);
    this.sender = new MetadataSender(this.logger);
    this.indicesMetadataService = new IndicesMetadataService({
      sender: this.sender,
      receiver: this.receiver,
      logger: this.logger,
    });
  }

  public setup(core: CoreSetup, plugin: IndicesMetadataPluginSetup) {
    const { taskManager } = plugin;

    this.indicesMetadataService.setup({ taskManager });
    this.sender.setup();
    this.receiver.setup();

    registerEbtEvents(core.analytics);
  }

  public start(core: CoreStart, plugin: IndicesMetadataPluginStart) {
    this.sender.start(core.analytics);
    this.receiver.start(core.elasticsearch.client.asInternalUser);
    this.indicesMetadataService
      .start({
        taskManager: plugin.taskManager,
      })
      .catch((error) => {
        this.logger.error('Failed to start indices metadata service', {
          error,
        });
      });
  }
}
