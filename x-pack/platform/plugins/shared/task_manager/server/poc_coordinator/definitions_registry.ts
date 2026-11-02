/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * A coordination-side stand-in for TaskTypeDictionary, rebuilt from the
 * serializable metadata snapshot. It deliberately implements the same public
 * surface the claim path uses (get/getAllTypes/getAllDefinitions/size/has/
 * iteration) so query helpers can be reused, but it can never hold a
 * createTaskRunner: behaviour does not cross the seam.
 */

import type { SerializedTaskTypeDefinition } from './types';

export class CoordinatorDefinitionsRegistry {
  private readonly definitions = new Map<string, SerializedTaskTypeDefinition>();

  constructor(defs: SerializedTaskTypeDefinition[]) {
    for (const def of defs) {
      this.definitions.set(def.type, def);
    }
  }

  [Symbol.iterator]() {
    return this.definitions.entries();
  }

  public getAllTypes(): string[] {
    return [...this.definitions.keys()];
  }

  public getAllDefinitions(): SerializedTaskTypeDefinition[] {
    return [...this.definitions.values()];
  }

  public has(type: string): boolean {
    return this.definitions.has(type);
  }

  public size(): number {
    return this.definitions.size;
  }

  public get(type: string): SerializedTaskTypeDefinition | undefined {
    return this.definitions.get(type);
  }
}
