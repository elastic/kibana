/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DataTypeDefinition {
  id: string;
  name: string;
  description?: string;
}

export interface DataCatalog {
  get(dataTypeId: string): DataTypeDefinition | undefined;
  list(): DataTypeDefinition[];
  register(dataType: DataTypeDefinition): void;
}

class DataCatalogImpl implements DataCatalog {
  private dataTypes: Map<string, DataTypeDefinition> = new Map();

  constructor() {}

  get(dataTypeId: string) {
    if (!this.dataTypes.has(dataTypeId)) {
      throw new Error(`Unknown data type: ${dataTypeId}`);
    }
    return this.dataTypes.get(dataTypeId);
  }

  list() {
    return [...this.dataTypes.values()];
  }

  register(dataType: DataTypeDefinition) {
    if (this.dataTypes.has(dataType.id)) {
      throw new Error(`Data type with id ${dataType.id} already registered`);
    }
    this.dataTypes.set(dataType.id, dataType);
  }
}

export const createDataCatalog = (): DataCatalog => {
  return new DataCatalogImpl();
};
