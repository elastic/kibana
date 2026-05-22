/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkFeaturesBodySchema, bulkFeaturesAcrossStreamsBodySchema } from './route';

describe('bulkFeaturesBodySchema', () => {
  it('accepts an exclude operation', () => {
    const result = bulkFeaturesBodySchema.safeParse({
      operations: [{ exclude: { id: 'feat-1' } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a restore operation', () => {
    const result = bulkFeaturesBodySchema.safeParse({
      operations: [{ restore: { id: 'feat-1' } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a delete operation', () => {
    const result = bulkFeaturesBodySchema.safeParse({
      operations: [{ delete: { id: 'feat-1' } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a mix of operations', () => {
    const result = bulkFeaturesBodySchema.safeParse({
      operations: [{ exclude: { id: 'a' } }, { restore: { id: 'b' } }, { delete: { id: 'c' } }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown verbs', () => {
    const result = bulkFeaturesBodySchema.safeParse({
      operations: [{ archive: { id: 'feat-1' } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing id on exclude', () => {
    const result = bulkFeaturesBodySchema.safeParse({
      operations: [{ exclude: {} }],
    });
    expect(result.success).toBe(false);
  });
});

describe('bulkFeaturesAcrossStreamsBodySchema', () => {
  it('accepts exclude/restore/delete', () => {
    const result = bulkFeaturesAcrossStreamsBodySchema.safeParse({
      operations: [{ exclude: { id: 'a' } }, { restore: { id: 'b' } }, { delete: { id: 'c' } }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects index operations (cross-stream is not for upserts)', () => {
    const result = bulkFeaturesAcrossStreamsBodySchema.safeParse({
      operations: [{ index: { feature: { id: 'x' } } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty operations array', () => {
    const result = bulkFeaturesAcrossStreamsBodySchema.safeParse({
      operations: [],
    });
    expect(result.success).toBe(false);
  });
});
