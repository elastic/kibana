/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverTypeDefinition } from './types';

export interface ResolverTypeRegistry {
  register<T extends string = string, TContent = unknown>(
    definition: ResolverTypeDefinition<T, TContent>
  ): void;
  has(typeId: string): boolean;
  get(typeId: string): ResolverTypeDefinition | undefined;
  list(): ResolverTypeDefinition[];
}

export const createResolverTypeRegistry = (): ResolverTypeRegistry => {
  return new ResolverTypeRegistryImpl();
};

class ResolverTypeRegistryImpl implements ResolverTypeRegistry {
  private types: Map<string, ResolverTypeDefinition> = new Map();

  register<T extends string = string, TContent = unknown>(
    definition: ResolverTypeDefinition<T, TContent>
  ): void {
    if (typeof definition.id !== 'string' || definition.id.length === 0) {
      throw new Error(`Invalid resolver type id: expected non-empty string`);
    }
    if (this.types.has(definition.id)) {
      throw new Error(`Resolver type with id '${definition.id}' is already registered`);
    }
    this.types.set(definition.id, definition as ResolverTypeDefinition);
  }

  has(typeId: string): boolean {
    return this.types.has(typeId);
  }

  get(typeId: string): ResolverTypeDefinition | undefined {
    return this.types.get(typeId);
  }

  list(): ResolverTypeDefinition[] {
    return [...this.types.values()];
  }
}
