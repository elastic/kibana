/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationDefinition, RuleTypeMigration } from './types';

/** Classic rule types that can be migrated to v2, keyed by rule type id. */
export class RuleMigrationRegistry {
  private readonly definitions = new Map<string, RuleMigrationDefinition>();

  public register(definition: RuleMigrationDefinition): void {
    if (this.definitions.has(definition.ruleTypeId)) {
      throw new Error(`A rule migration is already registered for "${definition.ruleTypeId}"`);
    }
    this.definitions.set(definition.ruleTypeId, definition);
  }

  public has(ruleTypeId: string): boolean {
    return this.definitions.has(ruleTypeId);
  }

  /** Resolves `undefined` when the rule type has no registered migration. */
  public async getMigration(ruleTypeId: string): Promise<RuleTypeMigration | undefined> {
    return this.definitions.get(ruleTypeId)?.load();
  }
}
