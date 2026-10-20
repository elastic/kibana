/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModuleDescriptor, RegistrySnapshot } from './protocol';

/** Maintains monotonic module replicas; hosts take a fresh revision for every admitted run. */
export class ModuleRegistry {
  private revision = 0;
  private readonly modules = new Map<string, ModuleDescriptor>();
  constructor(private readonly allowedSpecifiers: ReadonlySet<string>) {}

  public register(id: string, specifier: string, exportName: string): void {
    if (!this.allowedSpecifiers.has(specifier))
      throw new Error('Module specifier is not allowlisted');
    if (!id || !exportName) throw new Error('Module identity is required');
    this.revision++;
    this.modules.set(id, Object.freeze({ id, specifier, exportName, revision: this.revision }));
  }

  public remove(id: string): void {
    if (this.modules.delete(id)) this.revision++;
  }

  public snapshot(): RegistrySnapshot {
    return { revision: this.revision, modules: [...this.modules.values()] };
  }
}
