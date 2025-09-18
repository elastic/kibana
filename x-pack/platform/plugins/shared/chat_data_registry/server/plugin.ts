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
import { type DataCatalog, createDataCatalog } from './data_catalog';

export class ChatDataRegistryPlugin
  implements Plugin<ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart>
{
  private readonly logger: Logger;
  private dataCatalog: DataCatalog;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.dataCatalog = createDataCatalog();
  }

  public setup(core: CoreSetup): ChatDataRegistryPluginSetup {
    this.logger.debug('chatDataRegistry: Setup');

    return {
      register: (dataType) => this.dataCatalog.register(dataType),
    };
  }

  public start(core: CoreStart): ChatDataRegistryPluginStart {
    this.logger.debug('chatDataRegistry: Started');

    const registeredTypes = this.dataCatalog.list();
    this.logger.debug(`DataTypeRegistry contents: ${JSON.stringify(registeredTypes, null, 2)}`);

    return {};
  }

  public stop() {}
}
