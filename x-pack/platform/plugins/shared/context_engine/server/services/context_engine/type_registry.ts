/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEngineTypeDefinition } from './types';

export interface ContextEngineTypeRegistry {
  register(definition: ContextEngineTypeDefinition): void;
  has(typeId: string): boolean;
  get(typeId: string): ContextEngineTypeDefinition | undefined;
  list(): ContextEngineTypeDefinition[];
}

export const createContextEngineTypeRegistry = (): ContextEngineTypeRegistry => {
  return new ContextEngineTypeRegistryImpl();
};

const CONTEXT_ENGINE_TYPE_ID_PATTERN = /^[a-z][a-z0-9_-]*$/;

class ContextEngineTypeRegistryImpl implements ContextEngineTypeRegistry {
  private types: Map<string, ContextEngineTypeDefinition> = new Map();

  register(definition: ContextEngineTypeDefinition): void {
    if (!CONTEXT_ENGINE_TYPE_ID_PATTERN.test(definition.id)) {
      throw new Error(
        `Invalid Context Engine type id '${definition.id}': must match ${CONTEXT_ENGINE_TYPE_ID_PATTERN} (lowercase alphanumeric, hyphens, and underscores)`
      );
    }
    if (this.types.has(definition.id)) {
      throw new Error(`Context Engine type with id '${definition.id}' is already registered`);
    }
    this.types.set(definition.id, definition);
  }

  has(typeId: string): boolean {
    return this.types.has(typeId);
  }

  get(typeId: string): ContextEngineTypeDefinition | undefined {
    return this.types.get(typeId);
  }

  list(): ContextEngineTypeDefinition[] {
    return [...this.types.values()];
  }
}
