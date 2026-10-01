/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euidRankingSchema, setFieldsByConditionSchema } from './entity_schema';

describe('setFieldsByConditionSchema', () => {
  const alwaysCondition = { always: {} as const };

  it('should accept a payload with at least one field override', () => {
    const parsed = setFieldsByConditionSchema.safeParse({
      condition: alwaysCondition,
      fields: { 'entity.namespace': 'local' },
    });
    expect(parsed.success).toBe(true);
  });

  it('should accept a composition override when fields has at least one entry', () => {
    const parsed = setFieldsByConditionSchema.safeParse({
      condition: alwaysCondition,
      fields: {
        'user.name': { composition: { fields: ['user.id', 'host.name'], sep: '@' } },
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('should reject an empty fields map', () => {
    const result = setFieldsByConditionSchema.safeParse({
      condition: alwaysCondition,
      fields: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === 'At least one field override is required')
      ).toBe(true);
    }
  });

  it('should reject a composition value with an empty fields array', () => {
    const result = setFieldsByConditionSchema.safeParse({
      condition: alwaysCondition,
      fields: {
        'entity.id': { composition: { fields: [], sep: '@' } },
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('euidRankingSchema', () => {
  const minimalValid = {
    branches: [{ ranking: [[{ field: 'user.email' }]] }],
  };

  it('should accept a minimal valid ranking (one branch, one composition with a field)', () => {
    expect(euidRankingSchema.safeParse(minimalValid).success).toBe(true);
  });

  it('should accept a composition that mixes separators and fields', () => {
    const parsed = euidRankingSchema.safeParse({
      branches: [
        {
          ranking: [[{ field: 'user.name' }, { sep: '@' }, { field: 'user.domain' }]],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('should reject empty branches', () => {
    const parsed = euidRankingSchema.safeParse({ branches: [] });
    expect(parsed.success).toBe(false);
  });

  it('should reject a branch with empty ranking', () => {
    const parsed = euidRankingSchema.safeParse({
      branches: [{ ranking: [] }],
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject an empty composition', () => {
    const parsed = euidRankingSchema.safeParse({
      branches: [{ ranking: [[]] }],
    });
    expect(parsed.success).toBe(false);
  });

  it('should reject a composition with only separators (no field)', () => {
    const parsed = euidRankingSchema.safeParse({
      branches: [{ ranking: [[{ sep: '@' }, { sep: '.' }]] }],
    });
    expect(parsed.success).toBe(false);
  });
});
