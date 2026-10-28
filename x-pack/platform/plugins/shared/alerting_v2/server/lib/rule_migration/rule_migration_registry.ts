/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleMigrationDefinition } from './types';

/**
 * Classic rule types that can be migrated to v2, keyed by rule type id. Populated during
 * plugin setup via `ruleMigrations.register`; read-only afterward.
 */
@injectable()
export class RuleMigrationRegistry {
  private readonly definitions = new Map<string, RuleMigrationDefinition>();

  public register(definition: RuleMigrationDefinition): void {
    const { ruleTypeId } = definition;
    if (!ruleTypeId.trim()) {
      throw new Error('A rule migration must have a rule type id');
    }
    if (this.definitions.has(ruleTypeId)) {
      throw new Error(`A rule migration is already registered for "${ruleTypeId}"`);
    }
    this.definitions.set(ruleTypeId, Object.freeze({ ...definition }));
  }

  public has(ruleTypeId: string): boolean {
    return this.definitions.has(ruleTypeId);
  }

  public get(ruleTypeId: string): RuleMigrationDefinition | undefined {
    return this.definitions.get(ruleTypeId);
  }

  public getRuleTypeIds(): string[] {
    return [...this.definitions.keys()];
  }
}
