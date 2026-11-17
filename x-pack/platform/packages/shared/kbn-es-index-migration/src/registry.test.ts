/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineMigration } from './define_migration';
import { createMigrationRegistry } from './registry';
import type { MigrationDefinition } from './types';

const build = (id: string, index = `.${id}`): MigrationDefinition =>
  defineMigration({
    id,
    resource: { kind: 'index', name: () => index },
    baseline: 1,
    execution: 'lifecycle',
    versions: { 2: { change: 'additive', mappings: { properties: {} } } },
  });

describe('createMigrationRegistry', () => {
  it('starts empty', () => {
    const registry = createMigrationRegistry();

    expect(registry.size).toBe(0);
    expect(registry.all()).toEqual([]);
  });

  it('registers and retrieves by id', () => {
    const registry = createMigrationRegistry();
    const definition = build('asset-criticality');

    registry.register(definition);

    expect(registry.get('asset-criticality')).toBe(definition);
    expect(registry.has('asset-criticality')).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('rejects a different migration reusing an id', () => {
    const registry = createMigrationRegistry();
    registry.register(build('asset-criticality'));

    expect(() => registry.register(build('asset-criticality', '.something-else'))).toThrow(
      /already registered as "asset-criticality"/
    );
  });

  it('tolerates the same definition being registered twice', () => {
    const registry = createMigrationRegistry();
    const definition = build('asset-criticality');

    registry.register(definition);
    registry.register(definition);

    expect(registry.size).toBe(1);
  });

  it('enumerates every registration', () => {
    const registry = createMigrationRegistry();
    registry.register(build('asset-criticality'));
    registry.register(build('risk-score'));

    expect(registry.all().map(({ id }) => id)).toEqual(['asset-criticality', 'risk-score']);
  });

  it('returns undefined for an unknown id', () => {
    const registry = createMigrationRegistry();

    expect(registry.get('nope')).toBeUndefined();
    expect(registry.has('nope')).toBe(false);
  });

  it('keeps registries independent of one another', () => {
    const first = createMigrationRegistry();
    const second = createMigrationRegistry();

    first.register(build('asset-criticality'));

    expect(second.size).toBe(0);
    expect(second.has('asset-criticality')).toBe(false);
  });
});
