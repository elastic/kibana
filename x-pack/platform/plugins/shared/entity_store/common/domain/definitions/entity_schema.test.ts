/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_DEFINITION_TYPE_MAX_LENGTH,
  entitySchema,
  euidRankingSchema,
  extractionBlockSchema,
  getPostAggFilter,
  getPostStatsFieldOverrides,
  getPreAggFieldOverrides,
  setFieldsByConditionSchema,
  validateEntityDefinitionType,
} from './entity_schema';

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

describe('validateEntityDefinitionType', () => {
  it('accepts a valid type name', () => {
    expect(validateEntityDefinitionType('k8s.pod')).toBeUndefined();
  });

  it('rejects a type name over the maximum length', () => {
    expect(validateEntityDefinitionType('a'.repeat(ENTITY_DEFINITION_TYPE_MAX_LENGTH + 1))).toBe(
      `type name exceeds the maximum length of ${ENTITY_DEFINITION_TYPE_MAX_LENGTH}`
    );
  });

  it.each(['a"b', 'a\\b'])('rejects %s', (type) => {
    expect(validateEntityDefinitionType(type)).toMatch(/^type name does not match pattern /);
  });
});

describe('entitySchema', () => {
  const core = {
    id: 'k8s.pod-default',
    type: 'k8s.pod',
    name: 'Kubernetes pods',
    identityField: { singleField: 'k8s.pod.uid' },
  };
  const field = {
    source: 'k8s.pod.name',
    destination: 'k8s.pod.name',
    retention: { operation: 'prefer_newest_value' as const },
  };

  it('accepts a definition with only the identity core', () => {
    expect(entitySchema.safeParse(core).success).toBe(true);
  });

  it('accepts a type name outside the built-in types', () => {
    expect(entitySchema.parse({ ...core, extraction: { fields: [field] } }).type).toBe('k8s.pod');
  });

  it.each([
    ['Host', /does not match pattern/],
    ['a'.repeat(ENTITY_DEFINITION_TYPE_MAX_LENGTH + 1), /exceeds the maximum length/],
  ])('rejects the type name %p with the rule it breaks', (type, message) => {
    const result = entitySchema.safeParse({ ...core, type });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message).join('; ')).toMatch(message);
  });

  it('accepts a definition with a description', () => {
    const description = 'A Kubernetes pod. Identified by k8s.pod.uid.';
    expect(entitySchema.parse({ ...core, description }).description).toBe(description);
  });

  it('accepts a definition without a description', () => {
    expect(entitySchema.parse(core).description).toBeUndefined();
  });

  it('accepts a description of 1024 characters and rejects one of 1025', () => {
    expect(entitySchema.safeParse({ ...core, description: 'a'.repeat(1024) }).success).toBe(true);
    expect(entitySchema.safeParse({ ...core, description: 'a'.repeat(1025) }).success).toBe(false);
  });

  describe('identityField', () => {
    const calculated = {
      euidRanking: { branches: [{ ranking: [[{ field: 'k8s.pod.uid' }]] }] },
      documentsFilter: { field: 'k8s.pod.uid', exists: true },
    };
    const single = { singleField: 'k8s.pod.uid' };

    it('accepts each variant on its own, unchanged', () => {
      expect(entitySchema.parse({ ...core, identityField: calculated }).identityField).toEqual(
        calculated
      );
      expect(entitySchema.parse({ ...core, identityField: single }).identityField).toEqual(single);
    });

    // Keys of both variants in one identity: neither variant may accept it by stripping the other's
    // keys, since consumers hold the unparsed object and pick a variant by key presence.
    it('rejects an identity that carries keys of both variants', () => {
      expect(
        entitySchema.safeParse({ ...core, identityField: { ...calculated, ...single } }).success
      ).toBe(false);
      expect(
        entitySchema.safeParse({
          ...core,
          identityField: { ...single, euidRanking: calculated.euidRanking },
        }).success
      ).toBe(false);
    });

    it('rejects an unknown key in either variant', () => {
      expect(
        entitySchema.safeParse({ ...core, identityField: { ...calculated, typo: true } }).success
      ).toBe(false);
      expect(
        entitySchema.safeParse({ ...core, identityField: { ...single, typo: true } }).success
      ).toBe(false);
    });
  });

  describe('dynamic', () => {
    const dynamic = {
      sources: [
        {
          indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
          attributes: [{ name: 'namespace', field: 'k8s.namespace.name' }],
        },
      ],
    };

    it('accepts a dynamic block with the core only', () => {
      expect(entitySchema.parse({ ...core, dynamic }).dynamic).toEqual(dynamic);
    });

    it('accepts both blocks', () => {
      const parsed = entitySchema.parse({ ...core, extraction: { fields: [field] }, dynamic });
      expect(parsed.extraction?.fields).toEqual([field]);
      expect(parsed.dynamic).toEqual(dynamic);
    });

    it('rejects an unknown key inside dynamic', () => {
      expect(
        entitySchema.safeParse({ ...core, dynamic: { ...dynamic, metrics: [] } }).success
      ).toBe(false);
    });

    it('accepts a definition with neither block', () => {
      const parsed = entitySchema.parse(core);
      expect(parsed.extraction).toBeUndefined();
      expect(parsed.dynamic).toBeUndefined();
    });
  });
});

describe('extractionBlockSchema', () => {
  const field = {
    source: 'host.name',
    destination: 'host.name',
    retention: { operation: 'prefer_newest_value' as const },
  };

  it('rejects unknown keys', () => {
    expect(extractionBlockSchema.safeParse({ fields: [], indexPatterns: [] }).success).toBe(false);
  });

  it('requires fields', () => {
    expect(extractionBlockSchema.safeParse({}).success).toBe(false);
  });

  it('caps the number of fields', () => {
    expect(extractionBlockSchema.safeParse({ fields: Array(2000).fill(field) }).success).toBe(true);
    expect(extractionBlockSchema.safeParse({ fields: Array(2001).fill(field) }).success).toBe(
      false
    );
  });

  it('rejects an empty or over-long field name', () => {
    expect(extractionBlockSchema.safeParse({ fields: [{ ...field, source: '' }] }).success).toBe(
      false
    );
    expect(
      extractionBlockSchema.safeParse({ fields: [{ ...field, source: 'a'.repeat(1025) }] }).success
    ).toBe(false);
  });

  it('caps the entity type fallback length', () => {
    expect(
      extractionBlockSchema.safeParse({ fields: [], entityTypeFallback: 'a'.repeat(257) }).success
    ).toBe(false);
  });

  it('caps the number of set-fields rules', () => {
    const rule = { condition: { always: {} }, fields: { 'host.name': 'x' } };
    expect(
      extractionBlockSchema.safeParse({
        fields: [],
        whenConditionTrueSetFieldsPreAgg: Array(65).fill(rule),
      }).success
    ).toBe(false);
  });
});

describe('extraction accessors', () => {
  const postAggFilter = { field: 'entity.id', exists: true } as const;
  const overrides = [{ condition: { always: {} }, fields: { 'host.name': 'x' } }];
  const fields = [
    {
      source: 'host.name',
      destination: 'host.name',
      retention: { operation: 'prefer_newest_value' as const },
    },
  ];
  const extracted = {
    extraction: {
      fields,
      postAggFilter,
      whenConditionTrueSetFieldsPreAgg: overrides,
      whenConditionTrueSetFieldsAfterStats: overrides,
    },
  };
  const coreOnly = { extraction: undefined };

  it('read the extraction block when present', () => {
    expect(getPostAggFilter(extracted)).toBe(postAggFilter);
    expect(getPreAggFieldOverrides(extracted)).toBe(overrides);
    expect(getPostStatsFieldOverrides(extracted)).toBe(overrides);
  });

  it('return undefined when the block is absent', () => {
    expect(getPostAggFilter(coreOnly)).toBeUndefined();
    expect(getPreAggFieldOverrides(coreOnly)).toBeUndefined();
    expect(getPostStatsFieldOverrides(coreOnly)).toBeUndefined();
  });
});
