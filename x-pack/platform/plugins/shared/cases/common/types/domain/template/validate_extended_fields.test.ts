/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { MAX_EXTENDED_FIELD_VALUE_BYTES } from '../../../constants';
import { validateExtendedFields } from './validate_extended_fields';
import type { FieldSchema, InlineField } from './fields';
import { FieldType } from './fields';

type FieldSchemaType = z.infer<typeof FieldSchema>;

const makeInputTextField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'summary',
    label: 'Summary',
    type: 'keyword',
    control: FieldType.INPUT_TEXT,
    ...overrides,
  } as FieldSchemaType);

const makeInputNumberField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'score',
    label: 'Score',
    type: 'long',
    control: FieldType.INPUT_NUMBER,
    ...overrides,
  } as FieldSchemaType);

const makeSelectField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'priority',
    label: 'Priority',
    type: 'keyword',
    control: FieldType.SELECT_BASIC,
    metadata: { options: ['low', 'medium', 'high'] },
    ...overrides,
  } as FieldSchemaType);

const makeTextareaField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'notes',
    label: 'Notes',
    type: 'keyword',
    control: FieldType.TEXTAREA,
    ...overrides,
  } as FieldSchemaType);

const makeCheckboxGroupField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'systems',
    label: 'Systems',
    type: 'keyword',
    control: FieldType.CHECKBOX_GROUP,
    metadata: { options: ['api', 'database', 'cache'] },
    ...overrides,
  } as FieldSchemaType);

const makeUserPickerField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'assignee',
    label: 'Assignee',
    type: 'keyword',
    control: FieldType.USER_PICKER,
    ...overrides,
  } as FieldSchemaType);

const makeToggleField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'requires_escalation',
    label: 'Requires escalation',
    type: 'boolean',
    control: FieldType.TOGGLE,
    ...overrides,
  } as FieldSchemaType);

const makeMarkdownField = (overrides: Partial<FieldSchemaType> = {}): FieldSchemaType =>
  ({
    name: 'instructions',
    label: 'Instructions',
    type: 'keyword',
    control: FieldType.MARKDOWN,
    metadata: { content: 'Follow these steps.' },
    ...overrides,
  } as FieldSchemaType);

describe('validateExtendedFields', () => {
  describe('value size backstop', () => {
    const valueBearingFieldCases: Array<[string, FieldSchemaType, string]> = [
      ['INPUT_TEXT', makeInputTextField(), 'summary_as_keyword'],
      ['TEXTAREA', makeTextareaField(), 'notes_as_keyword'],
      ['INPUT_NUMBER', makeInputNumberField(), 'score_as_long'],
      ['SELECT_BASIC', makeSelectField(), 'priority_as_keyword'],
      ['CHECKBOX_GROUP', makeCheckboxGroupField(), 'systems_as_keyword'],
      ['USER_PICKER', makeUserPickerField(), 'assignee_as_keyword'],
      ['TOGGLE', makeToggleField(), 'requires_escalation_as_boolean'],
    ];

    it.each(valueBearingFieldCases)(
      'reports an error when a %s value exceeds the maximum byte size',
      (_control, field, key) => {
        const errors = validateExtendedFields(
          { [key]: 'a'.repeat(MAX_EXTENDED_FIELD_VALUE_BYTES + 1) },
          [field]
        );

        expect(errors).toContain(
          `Extended field "${key}" exceeds the maximum size of ${MAX_EXTENDED_FIELD_VALUE_BYTES} bytes`
        );
      }
    );

    it('accepts an ASCII field value exactly at the maximum byte size', () => {
      const fields: FieldSchemaType[] = [makeTextareaField()];
      const errors = validateExtendedFields(
        { notes_as_keyword: 'a'.repeat(MAX_EXTENDED_FIELD_VALUE_BYTES) },
        fields
      );

      expect(errors).not.toContain(
        `Extended field "notes_as_keyword" exceeds the maximum size of ${MAX_EXTENDED_FIELD_VALUE_BYTES} bytes`
      );
    });

    it('rejects a non-ASCII field value that exceeds the maximum byte size', () => {
      const fields: FieldSchemaType[] = [makeTextareaField()];
      const errors = validateExtendedFields(
        { notes_as_keyword: '界'.repeat(Math.floor(MAX_EXTENDED_FIELD_VALUE_BYTES / 3) + 1) },
        fields
      );

      expect(errors).toContain(
        `Extended field "notes_as_keyword" exceeds the maximum size of ${MAX_EXTENDED_FIELD_VALUE_BYTES} bytes`
      );
    });

    it('enforces the size backstop for an unknown key', () => {
      const fields: FieldSchemaType[] = [makeInputTextField()];
      const errors = validateExtendedFields(
        { rogue_as_keyword: 'a'.repeat(MAX_EXTENDED_FIELD_VALUE_BYTES + 1) },
        fields
      );

      expect(errors).toContain(
        'Unknown extended field key: "rogue_as_keyword". Available keys: "summary_as_keyword" (Summary)'
      );
      expect(errors).toContain(
        `Extended field "rogue_as_keyword" exceeds the maximum size of ${MAX_EXTENDED_FIELD_VALUE_BYTES} bytes`
      );
    });
  });

  describe('valid payload', () => {
    it('returns empty array for valid payload', () => {
      const fields: FieldSchemaType[] = [makeInputTextField()];
      const extendedFields = { summary_as_keyword: 'hello' };
      expect(validateExtendedFields(extendedFields, fields)).toEqual([]);
    });

    it('returns empty array for empty fields and empty extended fields', () => {
      expect(validateExtendedFields({}, [])).toEqual([]);
    });
  });

  describe('unknown keys', () => {
    it('lists the available keys and labels for an unknown key', () => {
      const fields: FieldSchemaType[] = [makeInputTextField(), makeSelectField()];
      const extendedFields = { unknown_as_keyword: 'value' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain(
        'Unknown extended field key: "unknown_as_keyword". Available keys: "summary_as_keyword" (Summary), "priority_as_keyword" (Priority)'
      );
    });

    it('suggests the exact key when the type suffix is wrong', () => {
      const fields: FieldSchemaType[] = [makeInputTextField()];
      // the key uses wrong type suffix
      const extendedFields = { summary_as_long: 'value' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain(
        'Unknown extended field key: "summary_as_long". To set the "Summary" field, use its key "summary_as_keyword"'
      );
    });

    it('suggests the exact key when the field name is sent without a suffix', () => {
      const fields: FieldSchemaType[] = [makeSelectField()];
      const errors = validateExtendedFields({ priority: 'high' }, fields);
      expect(errors).toContain(
        'Unknown extended field key: "priority". To set the "Priority" field, use its key "priority_as_keyword"'
      );
    });

    it('suggests the exact key when the field label is sent instead of the key', () => {
      const fields: FieldSchemaType[] = [makeToggleField()];
      const errors = validateExtendedFields({ 'Requires escalation': 'true' }, fields);
      expect(errors).toContain(
        'Unknown extended field key: "Requires escalation". To set the "Requires escalation" field, use its key "requires_escalation_as_boolean"'
      );
    });

    it('reports that no fields are available when none are configured', () => {
      const errors = validateExtendedFields({ rogue_as_keyword: 'value' }, []);
      expect(errors).toContain(
        'Unknown extended field key: "rogue_as_keyword". No fields are available for this case'
      );
    });
  });

  describe('required fields', () => {
    it('reports error when required field is missing', () => {
      const fields: FieldSchemaType[] = [makeInputTextField({ validation: { required: true } })];
      const errors = validateExtendedFields({}, fields);
      expect(errors).toContain('Field "Summary" is required');
    });

    it('reports error when required field is empty string', () => {
      const fields: FieldSchemaType[] = [makeInputTextField({ validation: { required: true } })];
      const errors = validateExtendedFields({ summary_as_keyword: '' }, fields);
      expect(errors).toContain('Field "Summary" is required');
    });

    it('does not report error when optional field is missing', () => {
      const fields: FieldSchemaType[] = [makeInputTextField()];
      const errors = validateExtendedFields({}, fields);
      expect(errors).toEqual([]);
    });

    it('uses field name as fallback when label is missing', () => {
      const fields: FieldSchemaType[] = [
        { ...makeInputTextField(), label: undefined, validation: { required: true } },
      ];
      const errors = validateExtendedFields({}, fields);
      expect(errors).toContain('Field "summary" is required');
    });
  });

  describe('display-only (MARKDOWN) fields', () => {
    it('does not enforce required on a display-only field', () => {
      const fields: FieldSchemaType[] = [makeMarkdownField({ validation: { required: true } })];
      const errors = validateExtendedFields({}, fields);
      expect(errors).toEqual([]);
    });

    it('does not enforce required_on_close on a display-only field', () => {
      const fields: FieldSchemaType[] = [
        makeMarkdownField({ validation: { required_on_close: true } }),
      ];
      const errors = validateExtendedFields({}, fields, { onClose: true });
      expect(errors).toEqual([]);
    });

    it('treats a value submitted for a display-only field as an unknown key', () => {
      const fields: FieldSchemaType[] = [makeMarkdownField()];
      const errors = validateExtendedFields({ instructions_as_keyword: 'value' }, fields);
      expect(errors).toContain(
        'Unknown extended field key: "instructions_as_keyword". The "Instructions" field is display-only and cannot hold a value'
      );
    });
  });

  describe('required_on_close flag', () => {
    it('does not report an error when required_on_close field is empty (onClose not set)', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ validation: { required_on_close: true } }),
      ];
      const errors = validateExtendedFields({}, fields);
      expect(errors).toEqual([]);
    });

    it('does not report an error when required_on_close field is an empty string (onClose not set)', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ validation: { required_on_close: true } }),
      ];
      const errors = validateExtendedFields({ summary_as_keyword: '' }, fields);
      expect(errors).toEqual([]);
    });

    it('does not treat required_on_close as required even alongside required: false (onClose not set)', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ validation: { required: false, required_on_close: true } }),
      ];
      const errors = validateExtendedFields({}, fields);
      expect(errors).toEqual([]);
    });

    it('reports error when required_on_close field is missing and onClose is true', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ validation: { required_on_close: true } }),
      ];
      // FAILURE SCENARIO: case is being closed but the required_on_close field was never filled
      const errors = validateExtendedFields({}, fields, { onClose: true });
      expect(errors).toContain('Field "Summary" is required');
    });

    it('reports error when required_on_close field is empty string and onClose is true', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ validation: { required_on_close: true } }),
      ];
      // FAILURE SCENARIO: field exists but was explicitly cleared before closing
      const errors = validateExtendedFields({ summary_as_keyword: '' }, fields, { onClose: true });
      expect(errors).toContain('Field "Summary" is required');
    });

    it('does not report error when required_on_close field has a value and onClose is true', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ validation: { required_on_close: true } }),
      ];
      const errors = validateExtendedFields({ summary_as_keyword: 'resolution notes' }, fields, {
        onClose: true,
      });
      expect(errors).toEqual([]);
    });

    it('skips required_on_close for hidden fields when onClose is true', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ name: 'trigger', label: 'Trigger', type: 'keyword' }),
        makeInputTextField({
          name: 'summary',
          label: 'Summary',
          type: 'keyword',
          display: {
            show_when: { field: 'trigger', operator: 'eq', value: 'show_me' },
          },
          validation: { required_on_close: true },
        }),
      ];
      // trigger is not 'show_me', so summary is hidden → skip required_on_close
      const errors = validateExtendedFields({ trigger_as_keyword: 'other' }, fields, {
        onClose: true,
      });
      expect(errors).toEqual([]);
    });

    it('enforces required_on_close for visible conditional fields when onClose is true', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ name: 'trigger', label: 'Trigger', type: 'keyword' }),
        makeInputTextField({
          name: 'summary',
          label: 'Summary',
          type: 'keyword',
          display: {
            show_when: { field: 'trigger', operator: 'eq', value: 'show_me' },
          },
          validation: { required_on_close: true },
        }),
      ];
      // trigger equals 'show_me' → field is visible → required on close
      const errors = validateExtendedFields({ trigger_as_keyword: 'show_me' }, fields, {
        onClose: true,
      });
      expect(errors).toContain('Field "Summary" is required');
    });
  });

  describe('hintFields — global key suggestions in template pass', () => {
    it('suggests a global storage key when the user sends the field name without the suffix', () => {
      // Template-only field set (no global keys). The request sends "priority" which is close to
      // the global field "priority_as_keyword". Without hintFields the error cannot point at the
      // global key; with hintFields it can.
      const templateField = makeInputTextField({
        name: 'summary',
        label: 'Summary',
        type: 'keyword',
      });
      const globalField = makeSelectField(); // name: 'priority', key: 'priority_as_keyword'
      const errors = validateExtendedFields({ priority: 'high' }, [templateField], {
        hintFields: [globalField] as InlineField[],
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('priority_as_keyword');
    });

    it('uses only the validated field set for "Available keys" when hintFields have no match', () => {
      const templateField = makeInputTextField({
        name: 'summary',
        label: 'Summary',
        type: 'keyword',
      });
      const globalField = makeSelectField(); // unrelated — "completely_different_as_keyword"
      const errors = validateExtendedFields({ totally_unknown: 'value' }, [templateField], {
        hintFields: [globalField] as InlineField[],
      });
      expect(errors).toHaveLength(1);
      // Falls through to the "Available keys" branch — should list both sets.
      expect(errors[0]).toContain('Unknown extended field key');
    });
  });

  describe('CHECKBOX_GROUP / USER_PICKER condition evaluation', () => {
    it('treats an empty CHECKBOX_GROUP ("[]") as empty for required_when', () => {
      // The controlling field is a CHECKBOX_GROUP. Its serialized empty value is '[]', not ''.
      // Without a fieldControlMap, evaluateScalarRule would see '[]' as non-empty and wrongly
      // make the dependent field required.
      const controlField = makeCheckboxGroupField({ name: 'systems', label: 'Systems' });
      const dependentField = makeInputTextField({
        name: 'escalation_reason',
        label: 'Escalation reason',
        type: 'keyword',
        validation: {
          required_when: { field: 'systems', operator: 'not_empty' },
        },
      });
      // Empty CHECKBOX_GROUP → dependent field should NOT be required.
      expect(
        validateExtendedFields({ systems_as_keyword: '[]', escalation_reason_as_keyword: '' }, [
          controlField,
          dependentField,
        ])
      ).toEqual([]);
      // Non-empty CHECKBOX_GROUP → dependent field IS required.
      expect(
        validateExtendedFields(
          { systems_as_keyword: '["api"]', escalation_reason_as_keyword: '' },
          [controlField, dependentField]
        )
      ).toContain('Field "Escalation reason" is required');
    });

    it('hides a field when its show_when controller is an empty CHECKBOX_GROUP', () => {
      const controlField = makeCheckboxGroupField({ name: 'systems', label: 'Systems' });
      const dependentField = makeInputTextField({
        name: 'escalation_reason',
        label: 'Escalation reason',
        type: 'keyword',
        validation: { required: true },
        display: {
          show_when: { field: 'systems', operator: 'not_empty' },
        },
      });
      // Empty CHECKBOX_GROUP → dependent field is hidden → not required.
      expect(
        validateExtendedFields({ systems_as_keyword: '[]', escalation_reason_as_keyword: '' }, [
          controlField,
          dependentField,
        ])
      ).toEqual([]);
    });

    it('treats an empty USER_PICKER ("[]") as empty for required_when', () => {
      const controlField = makeUserPickerField({ name: 'assignee', label: 'Assignee' });
      const dependentField = makeInputTextField({
        name: 'assignment_reason',
        label: 'Assignment reason',
        type: 'keyword',
        validation: {
          required_when: { field: 'assignee', operator: 'not_empty' },
        },
      });
      expect(
        validateExtendedFields({ assignee_as_keyword: '[]', assignment_reason_as_keyword: '' }, [
          controlField,
          dependentField,
        ])
      ).toEqual([]);
    });
  });

  describe('required_when condition', () => {
    it('treats field as required when required_when evaluates to true', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ name: 'trigger', label: 'Trigger', type: 'keyword' }),
        makeInputTextField({
          name: 'details',
          label: 'Details',
          type: 'keyword',
          validation: {
            required_when: { field: 'trigger', operator: 'not_empty' },
          },
        }),
      ];
      // trigger is set, so details becomes required
      const extendedFields = { trigger_as_keyword: 'yes' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Details" is required');
    });

    it('treats field as optional when required_when evaluates to false', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ name: 'trigger', label: 'Trigger', type: 'keyword' }),
        makeInputTextField({
          name: 'details',
          label: 'Details',
          type: 'keyword',
          validation: {
            required_when: { field: 'trigger', operator: 'not_empty' },
          },
        }),
      ];
      // trigger is empty, so details is optional
      const extendedFields = { trigger_as_keyword: '' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toEqual([]);
    });
  });

  describe('show_when (hidden fields)', () => {
    it('skips hidden field even when required', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ name: 'trigger', label: 'Trigger', type: 'keyword' }),
        makeInputTextField({
          name: 'hidden_field',
          label: 'Hidden Field',
          type: 'keyword',
          display: {
            show_when: { field: 'trigger', operator: 'eq', value: 'show_me' },
          },
          validation: { required: true },
        }),
      ];
      // trigger is not 'show_me', so hidden_field is not shown → skip validation
      const extendedFields = { trigger_as_keyword: 'something_else' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toEqual([]);
    });

    it('validates visible field that meets show_when condition', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ name: 'trigger', label: 'Trigger', type: 'keyword' }),
        makeInputTextField({
          name: 'visible_field',
          label: 'Visible Field',
          type: 'keyword',
          display: {
            show_when: { field: 'trigger', operator: 'eq', value: 'show_me' },
          },
          validation: { required: true },
        }),
      ];
      // trigger equals 'show_me' → field is visible → required
      const extendedFields = { trigger_as_keyword: 'show_me' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Visible Field" is required');
    });
  });

  describe('pattern validation', () => {
    it('reports error when pattern does not match', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({
          validation: {
            pattern: { regex: '^\\d+$', message: 'Must be digits only' },
          },
        }),
      ];
      const extendedFields = { summary_as_keyword: 'abc' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Must be digits only');
    });

    it('does not report error when pattern matches', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({
          validation: {
            pattern: { regex: '^\\d+$', message: 'Must be digits only' },
          },
        }),
      ];
      const extendedFields = { summary_as_keyword: '12345' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toEqual([]);
    });

    it('uses default message when pattern message is not set', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({
          validation: {
            pattern: { regex: '^\\d+$' },
          },
        }),
      ];
      const extendedFields = { summary_as_keyword: 'abc' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors[0]).toMatch(/does not match pattern/);
    });

    it('silently skips invalid regex', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({
          validation: {
            pattern: { regex: '[invalid' },
          },
        }),
      ];
      const extendedFields = { summary_as_keyword: 'hello' };
      expect(() => validateExtendedFields(extendedFields, fields)).not.toThrow();
      expect(validateExtendedFields(extendedFields, fields)).toEqual([]);
    });
  });

  describe('min_length / max_length for INPUT_TEXT', () => {
    it('reports error when value is shorter than min_length', () => {
      const fields: FieldSchemaType[] = [makeInputTextField({ validation: { min_length: 5 } })];
      const extendedFields = { summary_as_keyword: 'hi' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Summary" must be at least 5 characters');
    });

    it('reports error when value exceeds max_length', () => {
      const fields: FieldSchemaType[] = [makeInputTextField({ validation: { max_length: 3 } })];
      const extendedFields = { summary_as_keyword: 'toolong' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Summary" must be at most 3 characters');
    });

    it('does not report error when value is within length bounds', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({ validation: { min_length: 2, max_length: 10 } }),
      ];
      const extendedFields = { summary_as_keyword: 'hello' };
      expect(validateExtendedFields(extendedFields, fields)).toEqual([]);
    });
  });

  describe('min_length / max_length for TEXTAREA', () => {
    it('reports error when textarea value is shorter than min_length', () => {
      const fields: FieldSchemaType[] = [makeTextareaField({ validation: { min_length: 10 } })];
      const extendedFields = { notes_as_keyword: 'short' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Notes" must be at least 10 characters');
    });
  });

  describe('INPUT_NUMBER validation', () => {
    it('reports error for non-numeric value', () => {
      const fields: FieldSchemaType[] = [makeInputNumberField()];
      const extendedFields = { score_as_long: 'notanumber' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Score" must be a number');
    });

    it('reports error when value is below min', () => {
      const fields: FieldSchemaType[] = [makeInputNumberField({ validation: { min: 0 } })];
      const extendedFields = { score_as_long: '-5' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Score" must be >= 0');
    });

    it('reports error when value exceeds max', () => {
      const fields: FieldSchemaType[] = [makeInputNumberField({ validation: { max: 100 } })];
      const extendedFields = { score_as_long: '150' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Score" must be <= 100');
    });

    it('does not report error for valid numeric value within range', () => {
      const fields: FieldSchemaType[] = [
        makeInputNumberField({ validation: { min: 0, max: 100 } }),
      ];
      const extendedFields = { score_as_long: '50' };
      expect(validateExtendedFields(extendedFields, fields)).toEqual([]);
    });
  });

  describe('SELECT_BASIC validation', () => {
    it('reports error for invalid option', () => {
      const fields: FieldSchemaType[] = [makeSelectField()];
      const extendedFields = { priority_as_keyword: 'critical' };
      const errors = validateExtendedFields(extendedFields, fields);
      expect(errors).toContain('Field "Priority" must be one of: low, medium, high');
    });

    it('does not report error for valid option', () => {
      const fields: FieldSchemaType[] = [makeSelectField()];
      const extendedFields = { priority_as_keyword: 'medium' };
      expect(validateExtendedFields(extendedFields, fields)).toEqual([]);
    });
  });

  describe('CHECKBOX_GROUP validation', () => {
    it('reports error when required field is empty array', () => {
      const fields: FieldSchemaType[] = [
        makeCheckboxGroupField({ validation: { required: true } }),
      ];
      const errors = validateExtendedFields({ systems_as_keyword: '[]' }, fields);
      expect(errors).toContain('Field "Systems" is required');
    });

    it('does not report required error when field has selections', () => {
      const fields: FieldSchemaType[] = [
        makeCheckboxGroupField({ validation: { required: true } }),
      ];
      const errors = validateExtendedFields({ systems_as_keyword: '["api","database"]' }, fields);
      expect(errors).toEqual([]);
    });

    it('reports error for values not in options', () => {
      const fields: FieldSchemaType[] = [makeCheckboxGroupField()];
      const errors = validateExtendedFields({ systems_as_keyword: '["api","unknown"]' }, fields);
      expect(errors).toContain('Field "Systems" contains invalid options: unknown');
    });

    it('does not report error when all selected values are valid options', () => {
      const fields: FieldSchemaType[] = [makeCheckboxGroupField()];
      const errors = validateExtendedFields({ systems_as_keyword: '["api","cache"]' }, fields);
      expect(errors).toEqual([]);
    });

    it('does not report error when optional and empty', () => {
      const fields: FieldSchemaType[] = [makeCheckboxGroupField()];
      const errors = validateExtendedFields({ systems_as_keyword: '[]' }, fields);
      expect(errors).toEqual([]);
    });
  });

  describe('USER_PICKER empty-array check', () => {
    it('reports required error when value is empty JSON array', () => {
      const fields: FieldSchemaType[] = [makeUserPickerField({ validation: { required: true } })];
      const errors = validateExtendedFields({ assignee_as_keyword: '[]' }, fields);
      expect(errors).toContain('Field "Assignee" is required');
    });

    it('does not report required error when users are selected', () => {
      const fields: FieldSchemaType[] = [makeUserPickerField({ validation: { required: true } })];
      const errors = validateExtendedFields(
        { assignee_as_keyword: '[{"uid":"u1","name":"Alice"}]' },
        fields
      );
      expect(errors).toEqual([]);
    });
  });

  describe('TOGGLE validation', () => {
    it('accepts true/false string values', () => {
      const fields: FieldSchemaType[] = [makeToggleField()];

      expect(validateExtendedFields({ requires_escalation_as_boolean: 'true' }, fields)).toEqual(
        []
      );
      expect(validateExtendedFields({ requires_escalation_as_boolean: 'false' }, fields)).toEqual(
        []
      );
    });

    it('rejects values other than true/false', () => {
      const fields: FieldSchemaType[] = [makeToggleField()];
      const errors = validateExtendedFields({ requires_escalation_as_boolean: 'yes' }, fields);

      expect(errors).toContain('Field "Requires escalation" must be either true or false');
    });
  });

  describe('empty optional field', () => {
    it('does not report error when optional field is empty', () => {
      const fields: FieldSchemaType[] = [makeInputTextField()];
      const extendedFields = { summary_as_keyword: '' };
      expect(validateExtendedFields(extendedFields, fields)).toEqual([]);
    });

    it('skips all further validation (pattern, length) for empty optional field', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({
          validation: {
            pattern: { regex: '^\\d+$', message: 'Must be digits only' },
            min_length: 5,
          },
        }),
      ];
      const extendedFields = { summary_as_keyword: '' };
      expect(validateExtendedFields(extendedFields, fields)).toEqual([]);
    });
  });

  describe('requiredOnly mode', () => {
    it('reports missing required fields', () => {
      const fields: FieldSchemaType[] = [makeInputTextField({ validation: { required: true } })];

      expect(validateExtendedFields({}, fields, { requiredOnly: true })).toEqual([
        'Field "Summary" is required',
      ]);
    });

    it('does not report unknown keys', () => {
      const fields: FieldSchemaType[] = [makeInputTextField()];

      expect(
        validateExtendedFields({ some_unlinked_mirror_key_as_keyword: 'x' }, fields, {
          requiredOnly: true,
        })
      ).toEqual([]);
    });

    it('does not run per-field value validation', () => {
      const fields: FieldSchemaType[] = [
        makeInputTextField({
          validation: { required: true, min_length: 10 },
        }),
      ];

      // 'hi' violates min_length but satisfies required — requiredOnly must accept it.
      expect(
        validateExtendedFields({ summary_as_keyword: 'hi' }, fields, { requiredOnly: true })
      ).toEqual([]);
    });

    it('does not run the value-size backstop', () => {
      const fields: FieldSchemaType[] = [makeInputTextField()];
      const oversized = 'a'.repeat(MAX_EXTENDED_FIELD_VALUE_BYTES + 1);

      expect(
        validateExtendedFields({ summary_as_keyword: oversized }, fields, { requiredOnly: true })
      ).toEqual([]);
    });

    it('still respects show_when visibility for required fields', () => {
      const fields: FieldSchemaType[] = [
        makeSelectField(),
        makeInputTextField({
          validation: { required: true },
          display: { show_when: { field: 'priority', operator: 'eq', value: 'high' } },
        }),
      ];

      // Hidden (condition not met) — required not enforced.
      expect(
        validateExtendedFields({ priority_as_keyword: 'low' }, fields, { requiredOnly: true })
      ).toEqual([]);
      // Visible — required enforced.
      expect(
        validateExtendedFields({ priority_as_keyword: 'high' }, fields, { requiredOnly: true })
      ).toEqual(['Field "Summary" is required']);
    });
  });
});
