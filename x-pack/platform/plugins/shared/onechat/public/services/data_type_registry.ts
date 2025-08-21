/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTypeComponentDescriptor } from '../application/components/data_catalog/data_catalog';

export class DataTypeRegistry {
  private descriptors = new Map<string, DataTypeComponentDescriptor>();

  /**
   * Register a data type component descriptor
   */
  register(descriptor: DataTypeComponentDescriptor): void {
    if (this.descriptors.has(descriptor.getDataType())) {
      throw new Error(
        `DataTypeComponentDescriptor with id '${descriptor.getDataType()}' is already registered`
      );
    }
    this.descriptors.set(descriptor.getDataType(), descriptor);
  }

  /**
   * Clear all registered descriptors
   */
  clear(): void {
    this.descriptors.clear();
  }
}
