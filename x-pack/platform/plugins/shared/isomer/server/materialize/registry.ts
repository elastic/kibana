/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Materializer } from './types';

/** Materializers keyed by saved object type, one per type. */
export class MaterializerRegistry {
  private readonly materializers = new Map<string, Materializer>();

  register<TConfig>(type: string, materializer: Materializer<TConfig>): void {
    if (this.materializers.has(type)) {
      throw new Error(`A materializer for saved object type "${type}" is already registered.`);
    }
    // Each materializer's `parse` produces the config its other methods take, so the registry
    // erases the config type without losing that pairing.
    this.materializers.set(type, materializer as Materializer);
  }

  get(type: string): Materializer | undefined {
    return this.materializers.get(type);
  }

  has(type: string): boolean {
    return this.materializers.has(type);
  }

  types(): string[] {
    return [...this.materializers.keys()];
  }
}
