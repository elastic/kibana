/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { DataTypeDefinition } from '../../../../server/services/data';

export interface DataTypeComponentDescriptor {
  getDataType(): DataTypeDefinition;
  getIcon?(): React.ComponentType;
}

export class DataTypeComponentRegistry {
  private readonly descriptors = new Map<string, DataTypeComponentDescriptor>();

  register(descriptor: DataTypeComponentDescriptor): void {
    const key = descriptor.getDataType().name;

    if (this.descriptors.has(key)) {
      throw new Error(`Component for '${key}' already registered.`);
    }

    this.descriptors.set(key, descriptor);
  }

  get(dataTypeName: string): DataTypeComponentDescriptor | undefined {
    return this.descriptors.get(dataTypeName);
  }

  list(): DataTypeComponentDescriptor[] {
    return [...this.descriptors.values()];
  }
}
