/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleBuilderType, RULE_BUILDER_TYPES } from './registry';
import { thresholdRuleBuilderType } from './threshold/definition';

describe('RULE_BUILDER_TYPES', () => {
  it('keys every builder by its type', () => {
    for (const [key, builder] of Object.entries(RULE_BUILDER_TYPES)) {
      expect(builder.type).toBe(key);
    }
  });

  it('uses types that are safe to embed in tool ids', () => {
    for (const { type } of Object.values(RULE_BUILDER_TYPES)) {
      expect(type).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
    }
  });

  describe.each(Object.values(RULE_BUILDER_TYPES).map((builder) => [builder.type, builder]))(
    '%s examples',
    (_type, builder) => {
      it('has at least one example', () => {
        expect(builder.examples.length).toBeGreaterThan(0);
      });

      it.each(builder.examples.map((example) => [example.description, example.params]))(
        '"%s" is valid and round-trips through build and parse',
        (_description, params) => {
          expect(builder.paramsSchema.parse(params)).toEqual(params);
          expect(builder.validate(params)).toEqual([]);
          expect(builder.parse(builder.build(params, { kind: 'alert' }))).toEqual(params);
        }
      );

      it('accepts an empty patch without filling in defaults', () => {
        expect(builder.paramsPatchSchema.parse({})).toEqual({});
      });
    }
  );
});

describe('getRuleBuilderType', () => {
  it('returns the threshold builder', () => {
    expect(getRuleBuilderType('threshold')).toBe(thresholdRuleBuilderType);
  });

  it('returns undefined for unknown types and inherited object keys', () => {
    expect(getRuleBuilderType('unknown')).toBeUndefined();
    expect(getRuleBuilderType('toString')).toBeUndefined();
  });
});
