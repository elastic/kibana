/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CeTypeDefinition } from './types';

export interface CeTypeRegistry {
  register(definition: CeTypeDefinition): void;
  has(typeId: string): boolean;
  get(typeId: string): CeTypeDefinition | undefined;
  list(): CeTypeDefinition[];
}

export const createCeTypeRegistry = (): CeTypeRegistry => {
  return new CeTypeRegistryImpl();
};

const CE_TYPE_ID_PATTERN = /^[a-z][a-z0-9_-]*$/;

class CeTypeRegistryImpl implements CeTypeRegistry {
  private types: Map<string, CeTypeDefinition> = new Map();

  register(definition: CeTypeDefinition): void {
    if (!CE_TYPE_ID_PATTERN.test(definition.id)) {
      throw new Error(
        `Invalid CE type id '${definition.id}': must match ${CE_TYPE_ID_PATTERN} (lowercase alphanumeric, hyphens, and underscores)`
      );
    }
    if (this.types.has(definition.id)) {
      throw new Error(`CE type with id '${definition.id}' is already registered`);
    }
    this.types.set(definition.id, definition);
  }

  has(typeId: string): boolean {
    return this.types.has(typeId);
  }

  get(typeId: string): CeTypeDefinition | undefined {
    return this.types.get(typeId);
  }

  list(): CeTypeDefinition[] {
    return [...this.types.values()];
  }
}
