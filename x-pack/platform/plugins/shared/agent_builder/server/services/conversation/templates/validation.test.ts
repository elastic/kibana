/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationTemplate,
  ConversationTemplateFieldDefinition,
} from '@kbn/agent-builder-common';
import {
  collectFieldViolations,
  validateMetadataUpdate,
  validateTemplateDefaults,
  validateTemplateDefinition,
  collectTemplateDefinitionErrors,
} from './validation';

const TEMPLATE_ID = 'test-template';

const makeDef = (
  overrides: Partial<ConversationTemplateFieldDefinition> = {}
): ConversationTemplateFieldDefinition => ({
  input_type: 'TEXT',
  ...overrides,
});

const makeTemplate = (
  fields: Record<string, ConversationTemplateFieldDefinition> = {},
  id = TEMPLATE_ID
): ConversationTemplate => ({
  id,
  version: 1,
  name: 'Test Template',
  description: 'Template for tests',
  fields,
});

// ---------------------------------------------------------------------------
// collectFieldViolations — per-field checks
// ---------------------------------------------------------------------------

describe('collectFieldViolations', () => {
  // required
  describe('required', () => {
    it('returns a violation for an empty string when required=true', () => {
      const def = makeDef({ required: true });
      expect(collectFieldViolations('f', def, '')).toHaveLength(1);
    });

    it('returns a violation for an empty array when required=true', () => {
      const def = makeDef({ input_type: 'TEXT_ARRAY', required: true });
      expect(collectFieldViolations('f', def, [])).toHaveLength(1);
    });

    it('returns no violation for false TOGGLE even when required=true', () => {
      const def = makeDef({ input_type: 'TOGGLE', required: true });
      // false is a valid boolean value, not "empty"
      expect(collectFieldViolations('f', def, false)).toHaveLength(0);
    });

    it('skips required when skipRequired=true', () => {
      const def = makeDef({ required: true });
      expect(collectFieldViolations('f', def, '', true)).toHaveLength(0);
    });
  });

  // SELECT
  describe('SELECT', () => {
    const def = makeDef({ input_type: 'SELECT', options: ['a', 'b', 'c'] });

    it('passes for a value in options', () => {
      expect(collectFieldViolations('f', def, 'a')).toHaveLength(0);
    });

    it('returns a violation for a value not in options', () => {
      const violations = collectFieldViolations('f', def, 'd');
      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('allowed options');
    });

    it('returns a type violation for a non-string value', () => {
      expect(collectFieldViolations('f', def, 42)).toHaveLength(1);
    });
  });

  // TEXT
  describe('TEXT', () => {
    it('passes for a string value', () => {
      expect(collectFieldViolations('f', makeDef({ input_type: 'TEXT' }), 'hello')).toHaveLength(0);
    });

    it('returns violation when max_length is exceeded', () => {
      const def = makeDef({ input_type: 'TEXT', max_length: 5 });
      expect(collectFieldViolations('f', def, 'toolongstring')).toHaveLength(1);
    });

    it('passes when value is within max_length', () => {
      const def = makeDef({ input_type: 'TEXT', max_length: 10 });
      expect(collectFieldViolations('f', def, 'short')).toHaveLength(0);
    });

    it('returns violation when regex does not match', () => {
      const def = makeDef({
        input_type: 'TEXT',
        regex: { pattern: '^\\d+$', message: 'digits only' },
      });
      expect(collectFieldViolations('f', def, 'abc')).toHaveLength(1);
    });

    it('passes when regex matches', () => {
      const def = makeDef({ input_type: 'TEXT', regex: { pattern: '^\\d+$' } });
      expect(collectFieldViolations('f', def, '123')).toHaveLength(0);
    });
  });

  // NUMBER
  describe('NUMBER', () => {
    const def = makeDef({ input_type: 'NUMBER', min: 0, max: 10 });

    it('passes for a valid number', () => {
      expect(collectFieldViolations('f', def, 5)).toHaveLength(0);
    });

    it('passes for a numeric string', () => {
      expect(collectFieldViolations('f', def, '5')).toHaveLength(0);
    });

    it('returns violation for a non-numeric value', () => {
      expect(collectFieldViolations('f', def, 'abc')).toHaveLength(1);
    });

    it('returns violation when below min', () => {
      expect(collectFieldViolations('f', def, -1)).toHaveLength(1);
    });

    it('returns violation when above max', () => {
      expect(collectFieldViolations('f', def, 11)).toHaveLength(1);
    });
  });

  // DATE
  describe('DATE', () => {
    const def = makeDef({ input_type: 'DATE' });

    it('passes for an ISO 8601 date', () => {
      expect(collectFieldViolations('f', def, '2025-01-15')).toHaveLength(0);
    });

    it('passes for a full ISO 8601 datetime', () => {
      expect(collectFieldViolations('f', def, '2025-01-15T12:00:00Z')).toHaveLength(0);
    });

    it('returns violation for a non-ISO string', () => {
      expect(collectFieldViolations('f', def, 'not-a-date')).toHaveLength(1);
    });

    it('returns violation for an impossible month (2025-13-45)', () => {
      expect(collectFieldViolations('f', def, '2025-13-45')).toHaveLength(1);
    });
  });

  // TOGGLE
  describe('TOGGLE', () => {
    const def = makeDef({ input_type: 'TOGGLE' });

    it('passes for true', () => {
      expect(collectFieldViolations('f', def, true)).toHaveLength(0);
    });

    it('passes for false', () => {
      expect(collectFieldViolations('f', def, false)).toHaveLength(0);
    });

    it('returns violation for a string "true"', () => {
      expect(collectFieldViolations('f', def, 'true')).toHaveLength(1);
    });
  });

  // TEXT_ARRAY
  describe('TEXT_ARRAY', () => {
    const def = makeDef({ input_type: 'TEXT_ARRAY', max_length: 10 });

    it('passes for an array of strings', () => {
      expect(collectFieldViolations('f', def, ['a', 'b', 'c'])).toHaveLength(0);
    });

    it('passes for a single string (coerced)', () => {
      expect(collectFieldViolations('f', def, 'single')).toHaveLength(0);
    });

    it('returns violation when an item exceeds max_length', () => {
      expect(collectFieldViolations('f', def, ['ok', 'toolongstring'])).toHaveLength(1);
    });

    it('returns violation for an array containing a non-string', () => {
      expect(collectFieldViolations('f', def, [1, 2])).toHaveLength(1);
    });
  });

  // USER
  describe('USER', () => {
    const def = makeDef({ input_type: 'USER' });

    it('passes for a non-empty string', () => {
      expect(collectFieldViolations('f', def, 'user@example.com')).toHaveLength(0);
    });

    it('returns type violation for a non-string', () => {
      expect(collectFieldViolations('f', def, 42)).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// validateMetadataUpdate — per-field error accumulation
// ---------------------------------------------------------------------------

describe('validateMetadataUpdate', () => {
  const fields: Record<string, ConversationTemplateFieldDefinition> = {
    severity: { input_type: 'SELECT', options: ['low', 'high'], required: true },
    summary: { input_type: 'TEXT', max_length: 20 },
    score: { input_type: 'NUMBER', min: 0, max: 10 },
  };

  it('passes when all values are valid', () => {
    expect(() =>
      validateMetadataUpdate(TEMPLATE_ID, fields, { severity: 'high', summary: 'ok', score: 5 })
    ).not.toThrow();
  });

  it('throws for an unknown key', () => {
    expect(() => validateMetadataUpdate(TEMPLATE_ID, fields, { unknown_key: 'x' })).toThrow(
      'not declared in template'
    );
  });

  it('accumulates multiple violations in one error', () => {
    expect(() =>
      validateMetadataUpdate(TEMPLATE_ID, fields, {
        severity: 'critical', // invalid option
        summary: 'x'.repeat(30), // exceeds max_length
        score: -5, // below min
      })
    ).toThrowError(
      // All three violations should be in the message
      expect.objectContaining({
        message: expect.stringMatching(/severity.*summary.*score|score.*summary.*severity/s),
      })
    );
  });

  it('reports required violation when setting an empty string', () => {
    expect(() => validateMetadataUpdate(TEMPLATE_ID, fields, { severity: '' })).toThrow('required');
  });
});

// ---------------------------------------------------------------------------
// validateTemplateDefaults — apply-time validation (skips required)
// ---------------------------------------------------------------------------

describe('validateTemplateDefaults', () => {
  it('passes for a template with no defaults', () => {
    const template = makeTemplate({
      name: { input_type: 'TEXT' },
    });
    expect(() => validateTemplateDefaults(template)).not.toThrow();
  });

  it('passes for valid defaults', () => {
    const template = makeTemplate({
      severity: { input_type: 'SELECT', options: ['low', 'high'], default_value: 'low' },
      toggled: { input_type: 'TOGGLE', default_value: false },
    });
    expect(() => validateTemplateDefaults(template)).not.toThrow();
  });

  it('does NOT throw when a required field has no default (field starts empty)', () => {
    const template = makeTemplate({
      name: { input_type: 'TEXT', required: true }, // no default_value
    });
    expect(() => validateTemplateDefaults(template)).not.toThrow();
  });

  it('throws when a default value fails a type check', () => {
    const template = makeTemplate({
      score: { input_type: 'NUMBER', default_value: 'not-a-number' },
    });
    expect(() => validateTemplateDefaults(template)).toThrow();
  });

  it('throws when a SELECT default is not in options', () => {
    const template = makeTemplate({
      severity: { input_type: 'SELECT', options: ['low', 'high'], default_value: 'critical' },
    });
    expect(() => validateTemplateDefaults(template)).toThrow('allowed options');
  });
});

// ---------------------------------------------------------------------------
// validateTemplateDefinition — self-validation of template metadata
// ---------------------------------------------------------------------------

describe('validateTemplateDefinition', () => {
  it('passes a valid template', () => {
    const template = makeTemplate({
      severity: { input_type: 'SELECT', options: ['low', 'high'] },
      notes: { input_type: 'TEXT', max_length: 500 },
    });
    expect(() => validateTemplateDefinition(template)).not.toThrow();
  });

  it('rejects a SELECT field with no options', () => {
    const template = makeTemplate({
      severity: { input_type: 'SELECT' },
    });
    expect(() => validateTemplateDefinition(template)).toThrow('options');
  });

  it('rejects max_length on a NUMBER field', () => {
    const template = makeTemplate({
      score: { input_type: 'NUMBER', max_length: 10 } as ConversationTemplateFieldDefinition,
    });
    expect(() => validateTemplateDefinition(template)).toThrow('max_length');
  });

  it('rejects min/max on a TEXT field', () => {
    const template = makeTemplate({
      notes: { input_type: 'TEXT', min: 0, max: 100 } as ConversationTemplateFieldDefinition,
    });
    expect(() => validateTemplateDefinition(template)).toThrow('"min"/"max"');
  });

  it('rejects regex on a TOGGLE field', () => {
    const template = makeTemplate({
      flag: {
        input_type: 'TOGGLE',
        regex: { pattern: '^true$' },
      } as ConversationTemplateFieldDefinition,
    });
    expect(() => validateTemplateDefinition(template)).toThrow('"regex"');
  });

  it('rejects options on a TEXT field', () => {
    const template = makeTemplate({
      note: { input_type: 'TEXT', options: ['a'] } as ConversationTemplateFieldDefinition,
    });
    expect(() => validateTemplateDefinition(template)).toThrow('"options"');
  });

  it('returns an array of all errors via collectTemplateDefinitionErrors', () => {
    const template = makeTemplate({
      severity: { input_type: 'SELECT' }, // missing options
      score: { input_type: 'NUMBER', max_length: 5 } as ConversationTemplateFieldDefinition, // wrong constraint
    });
    const errors = collectTemplateDefinitionErrors(template);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── OBJECT / OBJECT_ARRAY ────────────────────────────────────────────────────

describe('collectFieldViolations — OBJECT', () => {
  const objectDef = makeDef({
    input_type: 'OBJECT',
    properties: {
      name: { input_type: 'TEXT', required: true },
      age: { input_type: 'NUMBER' },
    },
  });

  it('returns no violations for a valid object', () => {
    expect(collectFieldViolations('obj', objectDef, { name: 'Alice', age: 30 })).toHaveLength(0);
  });

  it('returns a type violation when the value is not a plain object', () => {
    expect(collectFieldViolations('obj', objectDef, 'string')).not.toHaveLength(0);
    expect(collectFieldViolations('obj', objectDef, [{ name: 'x' }])).not.toHaveLength(0);
    expect(collectFieldViolations('obj', objectDef, 42)).not.toHaveLength(0);
  });

  it('returns a violation when a required nested property is missing', () => {
    const violations = collectFieldViolations('obj', objectDef, { age: 30 });
    expect(violations.length).toBeGreaterThan(0);
  });

  it('returns a violation when an undeclared nested key is present', () => {
    const violations = collectFieldViolations('obj', objectDef, {
      name: 'Alice',
      extra: 'boom',
    });
    expect(violations.length).toBeGreaterThan(0);
  });

  it('returns a required violation for an empty object when the field is required', () => {
    const requiredDef = makeDef({ input_type: 'OBJECT', required: true, properties: { x: { input_type: 'TEXT' } } });
    const violations = collectFieldViolations('obj', requiredDef, {});
    expect(violations.some((v) => v.includes('required'))).toBe(true);
  });

  it('includes the nested path in violation messages', () => {
    // `age` must be a number — passing a string causes a nested-type violation.
    const violations = collectFieldViolations('obj', objectDef, { name: 'Alice', age: 'thirty' });
    expect(violations.some((v) => v.includes('.age'))).toBe(true);
  });
});

describe('collectFieldViolations — OBJECT_ARRAY', () => {
  const arrayDef = makeDef({
    input_type: 'OBJECT_ARRAY',
    max_items: 2,
    properties: {
      type: { input_type: 'SELECT', options: ['ip', 'domain'], required: true },
      value: { input_type: 'TEXT', required: true },
    },
  });

  it('returns no violations for a valid array', () => {
    expect(
      collectFieldViolations('arr', arrayDef, [{ type: 'ip', value: '1.2.3.4' }])
    ).toHaveLength(0);
  });

  it('returns a type violation for non-arrays', () => {
    expect(collectFieldViolations('arr', arrayDef, { type: 'ip' })).not.toHaveLength(0);
  });

  it('returns a type violation when array items are not plain objects', () => {
    expect(collectFieldViolations('arr', arrayDef, ['ip', 'domain'])).not.toHaveLength(0);
  });

  it('returns a violation when an element fails the compiled schema', () => {
    const violations = collectFieldViolations('arr', arrayDef, [
      { type: 'unknown', value: 'x' }, // type is not in ['ip', 'domain']
    ]);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('includes the element index in violation messages', () => {
    const violations = collectFieldViolations('arr', arrayDef, [
      { type: 'ip', value: 'x' },
      { type: 'bad', value: 'y' }, // index [1]
    ]);
    expect(violations.some((v) => v.includes('[1]'))).toBe(true);
  });

  it('returns a violation when max_items is exceeded (via compiled schema)', () => {
    const big = [
      { type: 'ip', value: 'a' },
      { type: 'ip', value: 'b' },
      { type: 'ip', value: 'c' }, // over the limit of 2
    ];
    const violations = collectFieldViolations('arr', arrayDef, big);
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe('collectTemplateDefinitionErrors — OBJECT / OBJECT_ARRAY rules', () => {
  it('returns no errors for a valid OBJECT field', () => {
    const template = makeTemplate({
      payload: {
        input_type: 'OBJECT',
        properties: { key: { input_type: 'TEXT' } },
      },
    });
    expect(collectTemplateDefinitionErrors(template)).toHaveLength(0);
  });

  it('returns no errors for a valid OBJECT_ARRAY field', () => {
    const template = makeTemplate({
      items: {
        input_type: 'OBJECT_ARRAY',
        max_items: 10,
        properties: { name: { input_type: 'TEXT' } },
      },
    });
    expect(collectTemplateDefinitionErrors(template)).toHaveLength(0);
  });

  it('errors when OBJECT has no properties', () => {
    const template = makeTemplate({
      empty_obj: { input_type: 'OBJECT' },
    });
    expect(collectTemplateDefinitionErrors(template).some((e) => e.includes('properties'))).toBe(true);
  });

  it('errors when OBJECT has an empty properties map', () => {
    const template = makeTemplate({
      empty_obj: { input_type: 'OBJECT', properties: {} },
    });
    expect(collectTemplateDefinitionErrors(template).some((e) => e.includes('properties'))).toBe(true);
  });

  it('errors when max_items is declared on a non-OBJECT_ARRAY field', () => {
    const template = makeTemplate({
      score: { input_type: 'NUMBER', max_items: 5 } as ConversationTemplateFieldDefinition,
    });
    expect(collectTemplateDefinitionErrors(template).some((e) => e.includes('max_items'))).toBe(true);
  });

  it('errors when properties is declared on a non-OBJECT field', () => {
    const template = makeTemplate({
      score: {
        input_type: 'NUMBER',
        properties: { nested: { input_type: 'TEXT' } },
      } as ConversationTemplateFieldDefinition,
    });
    expect(collectTemplateDefinitionErrors(template).some((e) => e.includes('properties'))).toBe(true);
  });

  it('recurses into nested properties and validates them', () => {
    // The nested SELECT field is missing options — should be caught.
    const template = makeTemplate({
      indicators: {
        input_type: 'OBJECT_ARRAY',
        properties: {
          type: { input_type: 'SELECT' }, // missing options!
          value: { input_type: 'TEXT' },
        },
      },
    });
    const errors = collectTemplateDefinitionErrors(template);
    expect(errors.some((e) => e.includes('options'))).toBe(true);
    expect(errors.some((e) => e.includes('indicators.type'))).toBe(true);
  });

  it('errors when a nested field declares default_value', () => {
    const template = makeTemplate({
      wrapper: {
        input_type: 'OBJECT',
        properties: {
          score: { input_type: 'NUMBER', default_value: 5 },
        },
      },
    });
    expect(collectTemplateDefinitionErrors(template).some((e) => e.includes('default_value'))).toBe(true);
  });

  it('errors when the new default: switch branch is hit (unknown input_type)', () => {
    const template = makeTemplate({
      weird: { input_type: 'UNKNOWN_TYPE' as ConversationTemplateFieldDefinition['input_type'] },
    });
    // The default: case returns an "unsupported input_type" violation.
    const violations = collectFieldViolations('weird', template.fields.weird, 'anything');
    expect(violations.some((v) => v.includes('unsupported'))).toBe(true);
  });
});
