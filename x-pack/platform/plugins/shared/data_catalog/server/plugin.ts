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

import type { DataCatalogPluginSetup, DataCatalogPluginStart } from './types';
import type { DataCatalog } from './data_catalog';
import type { DataSource } from '../common/data_source_spec';
import { createDataCatalog } from './data_catalog';
import { registerRoutes } from './routes';

export class DataCatalogPlugin implements Plugin<DataCatalogPluginSetup, DataCatalogPluginStart> {
  private readonly logger: Logger;
  private dataCatalog: DataCatalog;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.dataCatalog = createDataCatalog();
  }

  public setup(core: CoreSetup): DataCatalogPluginSetup {
    this.logger.debug('dataSourcesRegistry: Setup');

    const router = core.http.createRouter();
    registerRoutes(router, this.dataCatalog);

    return {
      register: (dataSource: DataSource) => this.dataCatalog.register(dataSource),
    };
  }

  public start(core: CoreStart): DataCatalogPluginStart {
    const availableDataSources = this.dataCatalog.list();
    this.logger.debug(`DataCatalog contents: ${JSON.stringify(availableDataSources, null, 2)}`);

    return {
      getCatalog: () => this.dataCatalog,
    };
  }

  public stop() {}
}
