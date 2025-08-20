/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  createDataTypeRegistry,
  type DataTypeRegistry,
  type DataTypeDefinition,
} from './data_type_registry';

export interface DataServiceSetupDeps {
  logger: Logger;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataServiceStartDeps {}

export interface DataServiceSetup {
  register(dataType: DataTypeDefinition): void;
}

export interface DataServiceStart {
  getRegistry(): Promise<DataTypeRegistry>;
}

export class DataService {
  private setupDeps?: DataServiceSetupDeps;
  private dataTypeRegistry: DataTypeRegistry;

  constructor() {
    this.dataTypeRegistry = createDataTypeRegistry();
  }

  setup(deps: DataServiceSetupDeps): DataServiceSetup {
    this.setupDeps = deps;

    const { logger } = this.setupDeps;
    logger.info('Setting up the OneChat data service...');

    return {
      register: (dataType) => this.dataTypeRegistry.register(dataType),
    };
  }

  start(deps: DataServiceStartDeps): DataServiceStart {
    const { logger } = this.setupDeps!;
    logger.info('Starting the OneChat data service...');

    const getRegistry: DataServiceStart['getRegistry'] = async () => {
      return this.dataTypeRegistry;
    };

    return {
      getRegistry,
    };
  }
}
