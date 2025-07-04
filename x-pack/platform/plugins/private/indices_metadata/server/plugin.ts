/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { IndicesMetadataService } from './lib/indices_metadata_service';
import { registerEbtEvents } from './lib/ebt/events';
import { IMetadataReceiver, MetadataReceiver } from './lib/receiver';
import { IMetadataSender, MetadataSender } from './lib/sender';

export interface IndicesMetadataPluginSetup {
  taskManager: TaskManagerSetupContract;
}

export interface IndicesMetadataPluginStart {
  taskManager: TaskManagerStartContract;
}

export class IndicesMetadataPlugin {
  private readonly logger: Logger;
  private indicesMetadataService: IndicesMetadataService;
  private readonly receiver: IMetadataReceiver;
  private readonly sender: IMetadataSender;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();

    this.indicesMetadataService = new IndicesMetadataService(this.logger);
    this.receiver = new MetadataReceiver(this.logger);
    this.sender = new MetadataSender(this.logger);
  }

  public setup(core: CoreSetup, plugin: IndicesMetadataPluginSetup) {
    this.indicesMetadataService.setup({
      taskManager: plugin.taskManager,
    });

    registerEbtEvents(core.analytics);

    this.sender.setup();
    this.receiver.setup();
  }

  public start(core: CoreStart, plugin: IndicesMetadataPluginStart) {
    this.sender.start(core.analytics);
    this.receiver.start(core.elasticsearch.client.asInternalUser);

    const serviceStart = {
      taskManager: plugin.taskManager,
      sender: this.sender,
      receiver: this.receiver,
    };

    this.indicesMetadataService
      .start(serviceStart)
      .catch((error) => {
        this.logger.error('Failed to start indices metadata service', {
          error,
        });
      })
      .finally(() => {
        this.logger.debug('Indices metadata service started');
      });
  }
}
