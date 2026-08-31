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
  buildStrictFieldsArraySchema,
  collectExistingFieldNames,
} from './strict_fields';
import type { Field } from './fields';

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

describe('collectExistingFieldNames', () => {
  it('collects inline field names', () => {
    const fields = [
      { control: 'INPUT_TEXT', name: 'legacy-field', type: 'keyword' },
      { control: 'INPUT_NUMBER', name: 'severity_count', type: 'long' },
    ] as Field[];
    expect(collectExistingFieldNames(fields)).toEqual(new Set(['legacy-field', 'severity_count']));
  });

  it('collects $ref aliases but not $ref targets', () => {
    const fields = [
      { $ref: 'my_library_field', name: 'legacy-alias' },
      { $ref: 'other-library-field' },
    ] as Field[];
    expect(collectExistingFieldNames(fields)).toEqual(new Set(['legacy-alias']));
  });

  it('returns an empty set for an empty fields array', () => {
    expect(collectExistingFieldNames([])).toEqual(new Set());
  });

  it('excludes display-only (MARKDOWN) names — they are exempt, not grandfathered', () => {
    const fields = [
      { control: 'MARKDOWN', name: 'Triage instructions!', metadata: { content: 'Read me' } },
      { control: 'INPUT_TEXT', name: 'legacy-field', type: 'keyword' },
    ] as Field[];
    expect(collectExistingFieldNames(fields)).toEqual(new Set(['legacy-field']));
  });
});

describe('buildStrictFieldsArraySchema — grandfathering', () => {
  it('with no grandfathered names, behaves identically to StrictFieldsArraySchema', () => {
    const fields = [{ control: 'INPUT_TEXT', name: 'bad name!', type: 'keyword' }];
    expect(buildStrictFieldsArraySchema().safeParse(fields).success).toBe(false);
    expect(buildStrictFieldsArraySchema(new Set()).safeParse(fields).success).toBe(false);
  });

  it('accepts an untouched field whose name predates the authoring-charset rule', () => {
    const fields = [
      { control: 'INPUT_TEXT', name: 'legacy-field', type: 'keyword' },
      { control: 'INPUT_TEXT', name: 'new_valid_field', type: 'keyword' },
    ];
    const schema = buildStrictFieldsArraySchema(new Set(['legacy-field']));
    const result = schema.safeParse(fields);
    expect(result.success).toBe(true);
  });

  it('still rejects a brand-new field with an invalid name alongside a grandfathered one', () => {
    const fields = [
      { control: 'INPUT_TEXT', name: 'legacy-field', type: 'keyword' },
      { control: 'INPUT_TEXT', name: 'brand new field', type: 'keyword' },
    ];
    const schema = buildStrictFieldsArraySchema(new Set(['legacy-field']));
    const result = schema.safeParse(fields);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('brand new field');
    }
  });

  it('does NOT grandfather a rename to a different invalid name (byte-exact match only)', () => {
    // "legacy-field" was grandfathered; renaming it to "legacy-field-2" is a NEW name that
    // happens to also be invalid, and must be rejected like any other new invalid name.
    const fields = [{ control: 'INPUT_TEXT', name: 'legacy-field-2', type: 'keyword' }];
    const schema = buildStrictFieldsArraySchema(new Set(['legacy-field']));
    const result = schema.safeParse(fields);
    expect(result.success).toBe(false);
  });

  it('grandfathers a $ref alias the same way as an inline name', () => {
    const fields = [{ $ref: 'my_field', name: 'legacy-alias' }];
    const schema = buildStrictFieldsArraySchema(new Set(['legacy-alias']));
    expect(schema.safeParse(fields).success).toBe(true);
  });

  it('grandfathering a display-only (MARKDOWN) field name is a no-op (already exempt)', () => {
    const fields = [
      {
        control: 'MARKDOWN',
        name: 'legacy label with spaces',
        metadata: { content: 'Some instructions' },
      },
    ];
    expect(buildStrictFieldsArraySchema().safeParse(fields).success).toBe(true);
  });
});

describe('buildStrictFieldsArraySchema — folded-twin collisions', () => {
  const parseWithExisting = (name: string, existingNames: string[]) =>
    buildStrictFieldsArraySchema(new Set(existingNames)).safeParse([
      { control: 'INPUT_TEXT', name, type: 'keyword' },
    ]);

  it('rejects an underscore twin of an existing hyphenated name', () => {
    const result = parseWithExisting('my_field', ['my-field']);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('my_field');
      expect(result.error.issues[0].message).toContain('my-field');
    }
  });

  it('rejects a camelCase twin of an existing snake_case name', () => {
    const result = parseWithExisting('myField', ['my_field']);
    expect(result.success).toBe(false);
  });

  it('accepts a new name whose folded form matches no existing name', () => {
    const result = parseWithExisting('unrelated_name', ['my-field']);
    expect(result.success).toBe(true);
  });

  it('does not twin-reject the grandfathered name itself (byte-exact match wins)', () => {
    const result = parseWithExisting('my-field', ['my-field']);
    expect(result.success).toBe(true);
  });

  it('rejects a $ref alias that folds onto an existing name', () => {
    const result = buildStrictFieldsArraySchema(new Set(['my-field'])).safeParse([
      { $ref: 'library_field', name: 'my_field' },
    ]);
    expect(result.success).toBe(false);
  });

  it('applies no twin check on create (no existing names)', () => {
    const result = buildStrictFieldsArraySchema().safeParse([
      { control: 'INPUT_TEXT', name: 'my_field', type: 'keyword' },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects turning a stored MARKDOWN entry into a value-bearing field with its exempt name', () => {
    // The markdown label was exempt (not grandfathered) — see `collectExistingFieldNames` —
    // so switching the control to an input must re-run the full name checks and fail.
    const storedFields = [
      { control: 'MARKDOWN', name: 'Triage instructions!', metadata: { content: 'Read me' } },
    ] as Field[];
    const schema = buildStrictFieldsArraySchema(collectExistingFieldNames(storedFields));
    const result = schema.safeParse([
      { control: 'INPUT_TEXT', name: 'Triage instructions!', type: 'keyword' },
    ]);
    expect(result.success).toBe(false);
  });

  it('does not twin-reject a valid new name that folds onto a stored MARKDOWN label', () => {
    // Markdown fields hold no value, so a fold collision with their label is harmless.
    const storedFields = [
      { control: 'MARKDOWN', name: 'triage instructions', metadata: { content: 'Read me' } },
    ] as Field[];
    const schema = buildStrictFieldsArraySchema(collectExistingFieldNames(storedFields));
    const result = schema.safeParse([
      { control: 'INPUT_TEXT', name: 'triage_instructions', type: 'keyword' },
    ]);
    expect(result.success).toBe(true);
  });
});

describe('StrictFieldsArraySchema — length failures get a length message', () => {
  it('reports the length limit, not the charset rule, for an over-long clean name', () => {
    // Clean snake_case, but the derived `<name>_as_keyword` key exceeds MAX_SNAKE_KEY_LENGTH.
    const longName = 'a'.repeat(300);
    const result = StrictFieldsArraySchema.safeParse([
      { control: 'INPUT_TEXT', name: longName, type: 'keyword' },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('too long');
      expect(result.error.issues[0].message).toContain('256');
      expect(result.error.issues[0].message).not.toContain('must contain only letters');
    }
  });

  it('keeps the charset message for a charset failure', () => {
    const result = StrictFieldsArraySchema.safeParse([
      { control: 'INPUT_TEXT', name: 'bad name', type: 'keyword' },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('must contain only letters');
      expect(result.error.issues[0].message).not.toContain('too long');
    }
  });
});
