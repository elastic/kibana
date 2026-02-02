/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataSource } from '../common/data_source_spec';

export interface DataCatalog {
  get(dataSourceId: string): DataSource | undefined;
  list(): DataSource[];
  register(dataSource: DataSource): void;
}

class DataCatalogImpl implements DataCatalog {
  private dataSources: Map<string, DataSource> = new Map();

  constructor() {}

  get(dataSourceId: string) {
    if (!this.dataSources.has(dataSourceId)) {
      throw new Error(`Unknown data type: ${dataSourceId}`);
    }
    return this.dataSources.get(dataSourceId);
  }

  list() {
    return [...this.dataSources.values()];
  }

  register(dataSource: DataSource) {
    if (this.dataSources.has(dataSource.id)) {
      throw new Error(`Data type with id ${dataSource.id} already registered`);
    }
    this.dataSources.set(dataSource.id, dataSource);
  }
}

export const createDataCatalog = (): DataCatalog => {
  return new DataCatalogImpl();
};
