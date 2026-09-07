/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
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
    ).toThrow(/only letters, digits, and underscores/);
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

  describe('validate', () => {
    beforeEach(() => {
      registry.register({
        type: 'runbook',
        dataSchema: z
          .object({
            content: z
              .string()
              .min(1)
              .max(100)
              .refine((value) => value.trim().length > 0),
          })
          .strict(),
      });
    });

    describe('unregistered types', () => {
      const validate = (data: Record<string, unknown>) =>
        registry.validate([{ id: 'a1', type: 'unknown', data }]);

      it('passes data of any shape through untouched', () => {
        expect(() =>
          validate({ anything: true, nested: { deep: [1, 2, 3] }, note: 'a'.repeat(1024) })
        ).not.toThrow();
      });

      it('never rejects on size, so a rollback of the owning plugin cannot fail writes', () => {
        // Legal under a since-unregistered schema (e.g. `content: z.string().max(50_000)`).
        expect(() => validate({ content: 'a'.repeat(50_000) })).not.toThrow();
      });

      it('does not measure structured values either', () => {
        expect(() => validate({ list: new Array(1024).fill(1) })).not.toThrow();
      });
    });

    it('still validates a registered type when unregistered artifacts ride along', () => {
      expect(() =>
        registry.validate([
          { id: 'a1', type: 'unknown', data: { note: 'a'.repeat(50_000) } },
          { id: 'r1', type: 'runbook', data: { content: '' } },
        ])
      ).toThrow('has invalid data');
    });

    it('rejects invalid data for registered types with INVALID_ARTIFACT_DATA', () => {
      try {
        registry.validate([{ id: 'r1', type: 'runbook', data: { content: '' } }]);
        throw new Error('expected validation to throw');
      } catch (error) {
        expect(Boom.isBoom(error)).toBe(true);
        expect((error as Boom.Boom).data).toEqual(
          expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_ARTIFACT_DATA })
        );
      }
    });

    it('accepts valid registered data', () => {
      expect(() =>
        registry.validate([{ id: 'r1', type: 'runbook', data: { content: '# Steps' } }])
      ).not.toThrow();
    });
  });
});
