/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate, ConversationTemplateField } from '@kbn/agent-builder-common';
import { validateSingleField, validateTemplateFields } from './validation';

const TEMPLATE_ID = 'test-template';

const makeField = (overrides: Partial<ConversationTemplateField> = {}): ConversationTemplateField =>
  ({
    name: 'field_name',
    type: 'keyword',
    description: 'A test field',
    ...overrides,
  } as ConversationTemplateField);

const makeTemplate = (
  fields: ConversationTemplateField[],
  id = TEMPLATE_ID
): ConversationTemplate => ({
  id,
  name: 'Test Template',
  description: 'Template for tests',
  definition: { fields },
});

// ---------------------------------------------------------------------------
// validateSingleField
// ---------------------------------------------------------------------------

describe('validateSingleField', () => {
  describe('required rule', () => {
    const requiredField = makeField({ validation: { required: true } });

    it('throws for an empty string on a required field', () => {
      expect(() => validateSingleField(TEMPLATE_ID, requiredField, '')).toThrow(
        'value is required'
      );
    });

    it('passes for a non-empty value on a required field', () => {
      expect(() => validateSingleField(TEMPLATE_ID, requiredField, 'hello')).not.toThrow();
    });

    it('does not throw for boolean false on a required boolean field', () => {
      const boolField = makeField({ type: 'boolean', validation: { required: true } });
      // `false` is a valid boolean; only `undefined`/empty-string trigger required
      expect(() => validateSingleField(TEMPLATE_ID, boolField, false)).not.toThrow();
    });
  });

  describe('type checks', () => {
    it('passes a valid integer string', () => {
      const f = makeField({ type: 'integer' });
      expect(() => validateSingleField(TEMPLATE_ID, f, '42')).not.toThrow();
    });

    it('throws for a non-integer string on integer field', () => {
      const f = makeField({ type: 'integer' });
      expect(() => validateSingleField(TEMPLATE_ID, f, 'not-a-number')).toThrow(
        'not a valid integer'
      );
    });

    it('throws for a float string on integer field', () => {
      const f = makeField({ type: 'integer' });
      expect(() => validateSingleField(TEMPLATE_ID, f, '1.5')).toThrow('not a valid integer');
    });

    it('passes a valid float string', () => {
      const f = makeField({ type: 'float' });
      expect(() => validateSingleField(TEMPLATE_ID, f, '3.14')).not.toThrow();
    });

    it('throws for a non-numeric string on float field', () => {
      const f = makeField({ type: 'float' });
      expect(() => validateSingleField(TEMPLATE_ID, f, 'abc')).toThrow('not a valid float');
    });

    it('passes boolean true on a boolean field', () => {
      const f = makeField({ type: 'boolean' });
      expect(() => validateSingleField(TEMPLATE_ID, f, true)).not.toThrow();
    });

    it('throws for a string value on a boolean field', () => {
      const f = makeField({ type: 'boolean' });
      expect(() => validateSingleField(TEMPLATE_ID, f, 'true')).toThrow('must be a boolean');
    });

    it('passes a valid ISO 8601 date', () => {
      const f = makeField({ type: 'date' });
      expect(() => validateSingleField(TEMPLATE_ID, f, '2024-01-15')).not.toThrow();
    });

    it('throws for an invalid date string', () => {
      const f = makeField({ type: 'date' });
      expect(() => validateSingleField(TEMPLATE_ID, f, 'not-a-date')).toThrow(
        'not a valid ISO 8601 date'
      );
    });

    it('passes any string for keyword and text types', () => {
      const kw = makeField({ type: 'keyword' });
      const tx = makeField({ type: 'text' });
      expect(() => validateSingleField(TEMPLATE_ID, kw, 'anything')).not.toThrow();
      expect(() => validateSingleField(TEMPLATE_ID, tx, 'anything')).not.toThrow();
    });
  });

  describe('allowed_values rule', () => {
    const f = makeField({ validation: { allowed_values: ['low', 'medium', 'high'] } });

    it('passes for a value in the allowed list', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, 'low')).not.toThrow();
    });

    it('throws for a value not in the allowed list', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, 'critical')).toThrow(
        'not in allowed_values'
      );
    });
  });

  describe('pattern rule', () => {
    const f = makeField({ validation: { pattern: { regex: '^[A-Z]{3}-\\d+$' } } });

    it('passes a matching value', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, 'ABC-123')).not.toThrow();
    });

    it('throws for a non-matching value', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, 'bad-value')).toThrow(
        'does not match pattern'
      );
    });

    it('uses the custom message when provided', () => {
      const fWithMsg = makeField({
        validation: { pattern: { regex: '^\\d+$', message: 'must be digits only' } },
      });
      expect(() => validateSingleField(TEMPLATE_ID, fWithMsg, 'abc')).toThrow(
        'must be digits only'
      );
    });
  });

  describe('min_length / max_length rules', () => {
    const f = makeField({ validation: { min_length: 3, max_length: 8 } });

    it('passes for a value within the length range', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, 'hello')).not.toThrow();
    });

    it('throws when shorter than min_length', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, 'hi')).toThrow('at least 3');
    });

    it('throws when longer than max_length', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, 'toolongvalue')).toThrow('at most 8');
    });
  });

  describe('min / max numeric rules', () => {
    const f = makeField({ type: 'integer', validation: { min: 0, max: 100 } });

    it('passes for a value within the range', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, '50')).not.toThrow();
    });

    it('throws when below minimum', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, '-1')).toThrow('less than minimum 0');
    });

    it('throws when above maximum', () => {
      expect(() => validateSingleField(TEMPLATE_ID, f, '101')).toThrow('greater than maximum 100');
    });
  });

  describe('boolean fields skip non-boolean rules', () => {
    it('does not run pattern / allowed_values on boolean fields', () => {
      // boolean + allowed_values — the rule should be silently skipped
      const f = makeField({
        type: 'boolean',
        validation: { allowed_values: ['yes', 'no'] },
      });
      expect(() => validateSingleField(TEMPLATE_ID, f, true)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// validateTemplateFields (apply-time: required is skipped, type/rules checked)
// ---------------------------------------------------------------------------

describe('validateTemplateFields', () => {
  it('does not throw for a template with no fields', () => {
    const t = makeTemplate([]);
    expect(() => validateTemplateFields(t)).not.toThrow();
  });

  it('does not throw for fields with no default value', () => {
    const t = makeTemplate([makeField({ name: 'no_default' })]);
    expect(() => validateTemplateFields(t)).not.toThrow();
  });

  it('does not enforce required on fields with no value (apply-time skip)', () => {
    const t = makeTemplate([makeField({ validation: { required: true } })]);
    // No default value; required is skipped — should not throw
    expect(() => validateTemplateFields(t)).not.toThrow();
  });

  it('validates the type of a field that has a default value', () => {
    const t = makeTemplate([
      makeField({ type: 'integer', name: 'count', value: 'not-an-integer' }),
    ]);
    expect(() => validateTemplateFields(t)).toThrow('not a valid integer');
  });

  it('validates allowed_values for a field with a default value', () => {
    const t = makeTemplate([
      makeField({
        name: 'severity',
        value: 'critical',
        validation: { allowed_values: ['low', 'medium', 'high'] },
      }),
    ]);
    expect(() => validateTemplateFields(t)).toThrow('not in allowed_values');
  });

  it('passes when all default values are valid', () => {
    const t = makeTemplate([
      makeField({
        name: 'severity',
        value: 'high',
        validation: { allowed_values: ['low', 'medium', 'high'] },
      }),
      makeField({ type: 'integer', name: 'count', value: '10' }),
    ]);
    expect(() => validateTemplateFields(t)).not.toThrow();
  });

  it('handles a template with undefined definition.fields gracefully', () => {
    const t: ConversationTemplate = {
      id: TEMPLATE_ID,
      name: 'No fields',
      description: 'desc',
      definition: { fields: undefined },
    };
    expect(() => validateTemplateFields(t)).not.toThrow();
  });
});
