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
