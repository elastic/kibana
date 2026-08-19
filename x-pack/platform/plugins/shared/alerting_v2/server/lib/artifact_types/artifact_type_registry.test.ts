/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ArtifactTypeRegistry } from './artifact_type_registry';
import { registerBuiltinArtifactTypes } from './register_builtin_artifact_types';

describe('ArtifactTypeRegistry', () => {
  let registry: ArtifactTypeRegistry;

  beforeEach(() => {
    registry = new ArtifactTypeRegistry();
  });

  it('registers and returns a type definition', () => {
    registry.register({
      type: 'custom.type',
      dataSchema: z.object({ title: z.string().max(32) }).strict(),
    });

    expect(registry.get('custom.type')?.type).toBe('custom.type');
  });

  it('rejects duplicate type registration', () => {
    const def = {
      type: 'custom.type',
      dataSchema: z.object({ title: z.string().max(32) }).strict(),
    };
    registry.register(def);
    expect(() => registry.register(def)).toThrow(/already registered/);
  });

  it('rejects a missing type id', () => {
    expect(() =>
      registry.register({
        type: '  ',
        dataSchema: z.object({ title: z.string().max(8) }).strict(),
      })
    ).toThrow(/non-empty type/);
  });

  it('rejects a reference field that contains a colon', () => {
    expect(() =>
      registry.register({
        type: 'custom.type',
        dataSchema: z.object({ dashboardId: z.string().max(64) }).strict(),
        references: [{ field: 'dash:board', savedObjectType: 'dashboard' }],
      })
    ).toThrow(/must match/);
  });

  it('is immune to the caller mutating its descriptors after registration', () => {
    const references = [{ field: 'dashboardId', savedObjectType: 'dashboard' }];
    registry.register({
      type: 'custom.type',
      dataSchema: z.object({ dashboardId: z.string().max(64) }).strict(),
      references,
    });

    references[0].savedObjectType = 'index-pattern';
    references.length = 0;

    expect(registry.get('custom.type')?.references).toEqual([
      { field: 'dashboardId', savedObjectType: 'dashboard' },
    ]);
  });

  it('rejects unbounded string schemas', () => {
    expect(() =>
      registry.register({
        type: 'custom.type',
        dataSchema: z.object({ title: z.string() }).strict(),
      })
    ).toThrow(/missing maxLength/);
  });

  it('rejects schemas that use z.unknown', () => {
    expect(() =>
      registry.register({
        type: 'custom.type',
        dataSchema: z.object({ payload: z.unknown() }).strict(),
      })
    ).toThrow(/unconstrained|JSON Schema|unsupported/);
  });

  it('rejects objects that allow additional properties', () => {
    expect(() =>
      registry.register({
        type: 'custom.type',
        dataSchema: z.object({ title: z.string().max(8) }).passthrough(),
      })
    ).toThrow(/additionalProperties|closed/);
  });

  it('registers built-in runbook and dashboard types', () => {
    registerBuiltinArtifactTypes(registry);
    expect(registry.get('runbook')).toBeDefined();
    expect(registry.get('dashboard')?.references?.[0]).toEqual({
      field: 'dashboardId',
      savedObjectType: 'dashboard',
    });
  });
});
