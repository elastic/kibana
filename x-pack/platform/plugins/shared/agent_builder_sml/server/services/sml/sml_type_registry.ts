/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from './types';

export interface SmlTypeRegistry {
  register(definition: SmlTypeDefinition): void;
  has(typeId: string): boolean;
  get(typeId: string): SmlTypeDefinition | undefined;
  list(): SmlTypeDefinition[];
}

export const createSmlTypeRegistry = (): SmlTypeRegistry => {
  return new SmlTypeRegistryImpl();
};

const SML_TYPE_ID_PATTERN = /^[a-z][a-z0-9_-]*$/;

class SmlTypeRegistryImpl implements SmlTypeRegistry {
  private types: Map<string, SmlTypeDefinition> = new Map();

  register(definition: SmlTypeDefinition): void {
    if (!SML_TYPE_ID_PATTERN.test(definition.id)) {
      throw new Error(
        `Invalid SML type id '${definition.id}': must match ${SML_TYPE_ID_PATTERN} (lowercase alphanumeric, hyphens, and underscores)`
      );
    }
    if (this.types.has(definition.id)) {
      throw new Error(`SML type with id '${definition.id}' is already registered`);
    }
    this.types.set(definition.id, definition);
  }

  has(typeId: string): boolean {
    return this.types.has(typeId);
  }

  get(typeId: string): SmlTypeDefinition | undefined {
    return this.types.get(typeId);
  }

  list(): SmlTypeDefinition[] {
    return [...this.types.values()];
  }
}
