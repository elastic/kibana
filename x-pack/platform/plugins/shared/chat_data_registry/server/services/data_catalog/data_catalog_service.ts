/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createDataCatalog, type DataCatalog, type DataTypeDefinition } from './data_catalog';

export interface DataCatalogServiceSetupDeps {
  logger: Logger;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataCatalogServiceStartDeps {}

export interface DataCatalogServiceSetup {
  register(dataType: DataTypeDefinition): void;
}

export interface DataCatalogServiceStart {
  getCatalog(): Promise<DataCatalog>;
}

export class DataCatalogService {
  private setupDeps?: DataCatalogServiceSetupDeps;
  private dataCatalog: DataCatalog;

  constructor() {
    this.dataCatalog = createDataCatalog();
  }

  setup(deps: DataCatalogServiceSetupDeps): DataCatalogServiceSetup {
    this.setupDeps = deps;

    const { logger } = this.setupDeps;
    logger.info('Setting up the Chat Data Registry service...');

    return {
      register: (dataType) => this.dataCatalog.register(dataType),
    };
  }

  start(deps: DataCatalogServiceStartDeps): DataCatalogServiceStart {
    const { logger } = this.setupDeps!;
    logger.info('Starting the Chat Data Registry service...');

    const getCatalog: DataCatalogServiceStart['getCatalog'] = async () => {
      return this.dataCatalog;
    };

    return {
      getCatalog,
    };
  }
}