/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart } from './types';
import { DataCatalogService } from './services';

export class ChatDataRegistryPlugin
  implements Plugin<ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart>
{
  private readonly logger: Logger;
  private dataCatalogService: DataCatalogService;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.dataCatalogService = new DataCatalogService();
  }

  public setup(core: CoreSetup): ChatDataRegistryPluginSetup {
    this.logger.debug('chatDataRegistry: Setup');

    const dataCatalogSetup = this.dataCatalogService.setup({ logger: this.logger });

    return {
      dataCatalog: dataCatalogSetup,
    };
  }

  public start(core: CoreStart): ChatDataRegistryPluginStart {
    this.logger.debug('chatDataRegistry: Started');

    const dataCatalogStart = this.dataCatalogService.start({});

    return {
      dataCatalog: dataCatalogStart,
    };
  }

  public stop() {}
}
