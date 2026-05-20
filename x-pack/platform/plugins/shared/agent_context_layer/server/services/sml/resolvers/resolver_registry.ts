/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlResolver, SmlResolverRegistry } from './types';

const RESOLVER_TYPE_PATTERN = /^[a-z][a-z0-9_-]*$/;

export const createSmlResolverRegistry = (): SmlResolverRegistry => {
  return new SmlResolverRegistryImpl();
};

class SmlResolverRegistryImpl implements SmlResolverRegistry {
  private readonly resolvers: Map<string, SmlResolver> = new Map();

  register(resolver: SmlResolver): void {
    if (!RESOLVER_TYPE_PATTERN.test(resolver.type)) {
      throw new Error(
        `Invalid SML resolver type '${resolver.type}': must match ${RESOLVER_TYPE_PATTERN} (lowercase alphanumeric, hyphens, and underscores)`
      );
    }
    if (this.resolvers.has(resolver.type)) {
      throw new Error(`SML resolver with type '${resolver.type}' is already registered`);
    }
    this.resolvers.set(resolver.type, resolver);
  }

  has(type: string): boolean {
    return this.resolvers.has(type);
  }

  get(type: string): SmlResolver | undefined {
    return this.resolvers.get(type);
  }

  list(): SmlResolver[] {
    return [...this.resolvers.values()];
  }
}
