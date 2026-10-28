/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMigrationRegistry } from './rule_migration_registry';
import type { RuleMigrationDefinition } from './types';

const definition: RuleMigrationDefinition = {
  ruleTypeId: '.es-query',
  convertParams: () => ({ query: { base: 'FROM logs-*' } }),
};

describe('RuleMigrationRegistry', () => {
  let registry: RuleMigrationRegistry;

  beforeEach(() => {
    registry = new RuleMigrationRegistry();
  });

  it('returns a registered migration by rule type id', () => {
    registry.register(definition);

    expect(registry.has('.es-query')).toBe(true);
    expect(registry.get('.es-query')).toEqual(definition);
    expect(registry.getRuleTypeIds()).toEqual(['.es-query']);
  });

  it('returns undefined for a rule type without a migration', () => {
    expect(registry.has('.index-threshold')).toBe(false);
    expect(registry.get('.index-threshold')).toBeUndefined();
  });

  it('throws when a rule type is registered twice', () => {
    registry.register(definition);

    expect(() => registry.register(definition)).toThrow(
      'A rule migration is already registered for ".es-query"'
    );
  });

  it('throws when the rule type id is blank', () => {
    expect(() => registry.register({ ...definition, ruleTypeId: ' ' })).toThrow(
      'A rule migration must have a rule type id'
    );
  });

  it('is not affected by later changes to the registered object', () => {
    const mutable = { ...definition };
    registry.register(mutable);
    mutable.convertParams = () => ({ query: { base: 'FROM other' } });

    expect(registry.get('.es-query')?.convertParams({})).toEqual({
      query: { base: 'FROM logs-*' },
    });
  });
});
