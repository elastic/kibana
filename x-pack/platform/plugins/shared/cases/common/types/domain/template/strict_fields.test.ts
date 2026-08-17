/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LONGEST_STORAGE_TYPE } from '../../../constants';
import {
  ALL_TEMPLATE_TYPE_SUFFIXES,
  splitSnakeKey,
} from '../../../../server/cases_analytics_v2/data_view/runtime_fields';
import { getFieldSnakeKey } from '../../../utils/template_fields';
import {
  StrictInlineFieldSchema,
  StrictFieldSchema,
  StrictFieldsArraySchema,
} from './strict_fields';

/**
 * Tests for strict_fields.ts.
 *
 * The load-bearing test is the round-trip: for any name `StrictInlineFieldSchema` accepts,
 * `splitSnakeKey(getFieldSnakeKey(name, type))` is non-null for every type suffix. That
 * asserts the invariant "every name a user can author produces a key that `splitSnakeKey`
 * accepts" — which is the whole point of this module.
 */
describe('LONGEST_STORAGE_TYPE', () => {
  it('is the longest type literal in ALL_TEMPLATE_TYPE_SUFFIXES', () => {
    // If a longer type literal is added to the field schemas, this test fails so that
    // LONGEST_STORAGE_TYPE in common/constants/index.ts can be updated. Without this
    // test, $ref alias validation would silently over-permit names that produce keys
    // longer than MAX_SNAKE_KEY_LENGTH when paired with the new longer type.
    const longest = ALL_TEMPLATE_TYPE_SUFFIXES.reduce(
      (max, s) => (s.length > max.length ? s : max),
      ''
    );
    expect(LONGEST_STORAGE_TYPE).toBe(longest);
  });
});

describe('StrictInlineFieldSchema', () => {
  const validInlineField = {
    control: 'INPUT_TEXT',
    name: 'risk_score',
    type: 'keyword',
  };

  describe('accepts', () => {
    it('names with letters, digits, and underscores', () => {
      const result = StrictInlineFieldSchema.safeParse({
        ...validInlineField,
        name: 'risk_score_2024',
      });
      expect(result.success).toBe(true);
    });

    it('names with uppercase letters', () => {
      const result = StrictInlineFieldSchema.safeParse({ ...validInlineField, name: 'RiskScore' });
      expect(result.success).toBe(true);
    });
  });

  describe('rejects', () => {
    it('names with hyphens', () => {
      const result = StrictInlineFieldSchema.safeParse({ ...validInlineField, name: 'risk-score' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
        expect(result.error.issues[0].message).toContain('risk-score');
      }
    });

    it('names with spaces', () => {
      const result = StrictInlineFieldSchema.safeParse({ ...validInlineField, name: 'Risk Score' });
      expect(result.success).toBe(false);
    });

    it('names with dots', () => {
      const result = StrictInlineFieldSchema.safeParse({ ...validInlineField, name: 'risk.score' });
      expect(result.success).toBe(false);
    });

    it('names with apostrophes (Painless-injection vector)', () => {
      const result = StrictInlineFieldSchema.safeParse({ ...validInlineField, name: "risk'score" });
      expect(result.success).toBe(false);
    });
  });

  describe('round-trip invariant', () => {
    it('every accepted name produces a key that splitSnakeKey parses for all type suffixes', () => {
      const candidateNames = [
        'risk_score',
        'MyField',
        'field_123',
        'A',
        'z',
        '0',
        '_leading_underscore',
        'a'.repeat(50),
      ];

      for (const name of candidateNames) {
        for (const suffix of ALL_TEMPLATE_TYPE_SUFFIXES) {
          // The field's control and type must be consistent — use INPUT_TEXT (keyword)
          // for the non-numeric suffix, INPUT_NUMBER for a numeric one. For this invariant
          // test we only need to confirm the derived key is parseable, not that it maps to
          // a real control. Construct a minimal valid field with the right `type`:
          const field = {
            control: suffix === 'keyword' ? 'INPUT_TEXT' : 'INPUT_NUMBER',
            name,
            type: suffix,
          };
          const parsed = StrictInlineFieldSchema.safeParse(field);
          // type may be invalid for the control (e.g. 'long' with INPUT_TEXT) — skip those
          if (parsed.success) {
            const snakeKey = getFieldSnakeKey(name, suffix);
            const split = splitSnakeKey(snakeKey);
            expect(split).not.toBeNull();
            if (split !== null) {
              expect(split.name).toBe(name);
              expect(split.suffix).toBe(suffix);
            }
          }
        }
      }
    });
  });
});

describe('StrictFieldSchema', () => {
  describe('$ref entries', () => {
    it('accepts a $ref without a name alias', () => {
      const result = StrictFieldSchema.safeParse({ $ref: 'my_library_field' });
      expect(result.success).toBe(true);
    });

    it('accepts a $ref with a valid name alias', () => {
      const result = StrictFieldSchema.safeParse({ $ref: 'my_field', name: 'my_alias' });
      expect(result.success).toBe(true);
    });

    it('rejects a $ref alias with a hyphen', () => {
      const result = StrictFieldSchema.safeParse({ $ref: 'my_field', name: 'my-alias' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('accepts a UUID-style $ref target (no alias) even though it contains hyphens', () => {
      // The $ref target is a library-definition name — we intentionally never validate it here.
      // UUID targets from the v1->v2 migration must remain readable.
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = StrictFieldSchema.safeParse({ $ref: uuid });
      expect(result.success).toBe(true);
    });
  });
});

describe('StrictFieldsArraySchema', () => {
  it('rejects a fields array containing a field with an invalid name', () => {
    const fields = [{ control: 'INPUT_TEXT', name: 'bad name!', type: 'keyword' }];
    const result = StrictFieldsArraySchema.safeParse(fields);
    expect(result.success).toBe(false);
  });

  it('rejects a fields array with duplicate names', () => {
    const fields = [
      { control: 'INPUT_TEXT', name: 'risk_score', type: 'keyword' },
      { control: 'INPUT_TEXT', name: 'risk_score', type: 'keyword' },
    ];
    const result = StrictFieldsArraySchema.safeParse(fields);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/unique/i);
    }
  });

  it('accepts a valid fields array', () => {
    const fields = [
      { control: 'INPUT_TEXT', name: 'risk_score', type: 'keyword' },
      { control: 'INPUT_NUMBER', name: 'severity_count', type: 'long' },
    ];
    const result = StrictFieldsArraySchema.safeParse(fields);
    expect(result.success).toBe(true);
  });
});
