/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { applyPatch } from './apply_patch';

const createSchema = z
  .object({
    name: z.string().min(1).describe('The name.'),
    description: z.string().optional().describe('The description.'),
    kind: z.enum(['alert', 'signal']),
    time_field: z.string().default('@timestamp').describe('The time field.'),
    // Describes and names the base object, then wraps, which is how the real schemas are authored.
    matcher: z
      .object({
        tags: z.array(z.string()).min(1).optional().describe('The tags.'),
        expression: z.string().min(1).optional(),
      })
      .strict()
      .describe('The matcher.')
      .meta({ id: 'alerting_matcher' })
      .optional(),
    state_transition: z
      .object({
        pending: z
          .object({ occurrences: z.number().optional(), timeframe: z.string().optional() })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    recovery: z
      .discriminatedUnion('strategy', [
        z.object({ strategy: z.literal('manual') }).strict(),
        z.object({ strategy: z.literal('condition'), segment: z.string() }).strict(),
      ])
      .optional(),
    artifacts: z.array(z.object({ id: z.string() }).strict()).optional(),
  })
  .strict();

describe('applyPatch', () => {
  const existing = {
    name: 'original',
    description: 'the original description',
    kind: 'alert',
    time_field: '@timestamp',
    matcher: { tags: ['prod'], expression: 'env: prod' },
    state_transition: { pending: { occurrences: 1, timeframe: '5m' } },
    recovery: { strategy: 'condition', segment: 'original segment' },
    artifacts: [{ id: 'a' }],
  };

  const merge = (patch: Record<string, unknown>) => applyPatch(createSchema, existing, patch);

  it('leaves the document untouched for an empty patch', () => {
    expect(merge({})).toEqual(existing);
  });

  it('ignores keys explicitly set to undefined', () => {
    expect(merge({ name: undefined })).toEqual(existing);
  });

  it('replaces a leaf', () => {
    expect(merge({ name: 'renamed' })).toEqual({ ...existing, name: 'renamed' });
  });

  it('clears a leaf without leaving a null behind', () => {
    const merged = merge({ description: null });

    expect(merged).not.toHaveProperty('description');
    expect(merged).toEqual({ ...existing, description: undefined });
  });

  it('merges a nested leaf and keeps its siblings', () => {
    expect(merge({ matcher: { tags: ['staging'] } })).toEqual({
      ...existing,
      matcher: { tags: ['staging'], expression: 'env: prod' },
    });
  });

  it('clears a nested leaf and keeps its siblings', () => {
    expect(merge({ matcher: { tags: null } })).toEqual({
      ...existing,
      matcher: { expression: 'env: prod' },
    });
  });

  it('clears a whole object', () => {
    const merged = merge({ matcher: null });

    expect(merged).not.toHaveProperty('matcher');
  });

  it('merges to arbitrary depth', () => {
    expect(merge({ state_transition: { pending: { occurrences: 9 } } })).toEqual({
      ...existing,
      state_transition: { pending: { occurrences: 9, timeframe: '5m' } },
    });
  });

  it('replaces an array wholesale rather than merging its elements', () => {
    expect(merge({ artifacts: [{ id: 'b' }] })).toEqual({ ...existing, artifacts: [{ id: 'b' }] });
  });

  it('replaces a union wholesale so the new variant cannot inherit stale members', () => {
    expect(merge({ recovery: { strategy: 'manual' } })).toEqual({
      ...existing,
      recovery: { strategy: 'manual' },
    });
  });

  it('never writes a null, at any depth', () => {
    const merged = merge({ matcher: { tags: null }, description: null, artifacts: null });

    expect(JSON.stringify(merged)).not.toContain('null');
  });

  it('builds the nested object when the document does not have one yet', () => {
    expect(applyPatch(createSchema, { name: 'n' }, { matcher: { tags: ['a'] } })).toEqual({
      name: 'n',
      matcher: { tags: ['a'] },
    });
  });

  it('produces a document the create schema accepts', () => {
    expect(createSchema.safeParse(merge({ matcher: { tags: null } })).success).toBe(true);
  });

  describe('clearing the last leaf of an object', () => {
    it('clears the object too', () => {
      const merged = applyPatch(
        createSchema,
        { name: 'n', matcher: { tags: ['a'] } },
        { matcher: { tags: null } }
      );

      expect(merged).not.toHaveProperty('matcher');
    });

    it('collapses innermost first, so an emptied parent goes with it', () => {
      const merged = applyPatch(
        createSchema,
        { name: 'n', state_transition: { pending: { occurrences: 1 } } },
        { state_transition: { pending: { occurrences: null } } }
      );

      expect(merged).not.toHaveProperty('state_transition');
    });

    it('keeps a parent that still has another child', () => {
      const merged = applyPatch(
        createSchema,
        { name: 'n', state_transition: { pending: { occurrences: 1, timeframe: '5m' } } },
        { state_transition: { pending: { occurrences: null } } }
      );

      expect(merged).toEqual({ name: 'n', state_transition: { pending: { timeframe: '5m' } } });
    });

    it('leaves a document the create schema still accepts', () => {
      const merged = applyPatch(
        createSchema,
        { name: 'n', kind: 'alert', matcher: { tags: ['a'] } },
        { matcher: { tags: null } }
      );

      expect(createSchema.safeParse(merged).success).toBe(true);
    });
  });
});
