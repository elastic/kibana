/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DataTypeComponent {
  /** Data type this descriptor handles */
  getDataType(): string;
  /** Display name for the data type */
  getDisplayName(): string;
  /** Optional icon component */
  getIcon?(): React.ComponentType;
  /** Optional description */
  getDescription?(): string;
}

export class DataTypeRegistry {
  private descriptors = new Map<string, DataTypeComponent>();

  /**
   * Register a data type component descriptor
   */
  register(descriptor: DataTypeComponent): void {
    if (this.descriptors.has(descriptor.getDataType())) {
      throw new Error(
        `DataTypeComponentDescriptor with id '${descriptor.getDataType()}' is already registered`
      );
    }
    this.descriptors.set(descriptor.getDataType(), descriptor);
  }

  /**
   * List all registered descriptors' IDs
   */
  list(): Array<string> {
    return Array.from(this.descriptors.keys());
  }

  /**
   * Clear all registered descriptors
   */
  clear(): void {
    this.descriptors.clear();
  }
}