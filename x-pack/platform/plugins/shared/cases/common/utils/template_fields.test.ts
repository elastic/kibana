/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import {
  applyRefFieldOverride,
  buildExtendedFieldsBackfill,
  buildExtendedFieldsDefaults,
  getFieldCamelKey,
  getFieldSnakeKey,
  getV2FieldType,
  getYamlDefaultAsString,
  mergeCustomFieldsIntoExtendedFields,
  parseFieldDefinitionsToInlineFields,
  resolveTemplateFields,
} from './template_fields';
import type { FieldDefinition } from '../types/domain/field_definition/latest';
import type { Field, InlineField, RefField } from '../types/domain/template/fields';

describe('template field key utils', () => {
  describe('getFieldSnakeKey', () => {
    it('combines name and type with _as_', () => {
      expect(getFieldSnakeKey('risk_score', 'keyword')).toBe('risk_score_as_keyword');
    });

    it('handles single-word name and type', () => {
      expect(getFieldSnakeKey('severity', 'text')).toBe('severity_as_text');
    });

    it('handles multi-segment names', () => {
      expect(getFieldSnakeKey('my_custom_field', 'number')).toBe('my_custom_field_as_number');
    });
  });

  describe('getFieldCamelKey', () => {
    it('returns the camelCase version of the snake key', () => {
      expect(getFieldCamelKey('risk_score', 'keyword')).toBe('riskScoreAsKeyword');
    });

    it('handles single-word name and type', () => {
      expect(getFieldCamelKey('severity', 'text')).toBe('severityAsText');
    });

    it('handles multi-segment names', () => {
      expect(getFieldCamelKey('my_custom_field', 'number')).toBe('myCustomFieldAsNumber');
    });

    it('is consistent with camelCase applied to getFieldSnakeKey output', () => {
      const name = 'some_field';
      const type = 'date';
      const snakeKey = getFieldSnakeKey(name, type);
      expect(getFieldCamelKey(name, type)).toBe(
        snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      );
    });
  });

  describe('parseFieldDefinitionsToInlineFields', () => {
    const makeDef = (
      overrides: Partial<FieldDefinition> & { defYaml?: object } = {}
    ): FieldDefinition => {
      const { defYaml, ...rest } = overrides;
      return {
        fieldDefinitionId: 'fd-1',
        name: 'my_field',
        owner: 'securitySolution',
        description: '',
        isGlobal: true,
        definition: yamlStringify(
          defYaml ?? { name: 'my_field', type: 'keyword', control: 'INPUT_TEXT', label: 'My Field' }
        ),
        ...rest,
      };
    };

    it('returns inline fields for valid definitions', () => {
      const fields = parseFieldDefinitionsToInlineFields([makeDef()]);
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('my_field');
    });

    it('returns an empty array for an empty input', () => {
      expect(parseFieldDefinitionsToInlineFields([])).toEqual([]);
    });

    it('skips definitions with malformed YAML', () => {
      const bad = makeDef({ definition: 'not: valid: yaml: [broken' });
      const good = makeDef({
        name: 'ok',
        definition: yamlStringify({
          name: 'ok',
          type: 'keyword',
          control: 'INPUT_TEXT',
          label: 'OK',
        }),
      });
      const fields = parseFieldDefinitionsToInlineFields([bad, good]);
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('ok');
    });

    it('skips definitions that fail FieldSchema validation', () => {
      const invalid = makeDef({ defYaml: { not_a_valid_field: true } });
      expect(parseFieldDefinitionsToInlineFields([invalid])).toHaveLength(0);
    });
  });

  describe('getYamlDefaultAsString', () => {
    it('serializes booleans as strings', () => {
      expect(getYamlDefaultAsString(true)).toBe('true');
      expect(getYamlDefaultAsString(false)).toBe('false');
    });

    it('serializes arrays as JSON strings', () => {
      expect(getYamlDefaultAsString(['a', 'b'])).toBe('["a","b"]');
    });
  });

  describe('applyRefFieldOverride', () => {
    const libField: InlineField = {
      name: 'lib_field',
      type: 'keyword',
      control: 'INPUT_TEXT',
      metadata: { default: 'from_lib' },
    };

    it('applies the $ref name alias', () => {
      const result = applyRefFieldOverride(libField, { $ref: 'lib_field', name: 'alias' });
      expect(result.name).toBe('alias');
      expect(result.metadata?.default).toBe('from_lib');
    });

    it('overrides the library default with the $ref override', () => {
      const result = applyRefFieldOverride(libField, {
        $ref: 'lib_field',
        metadata: { default: 'override' },
      });
      expect(result.metadata?.default).toBe('override');
    });

    it('inherits the library default when the $ref has no override', () => {
      const result = applyRefFieldOverride(libField, { $ref: 'lib_field' });
      expect(result.metadata?.default).toBe('from_lib');
    });

    it('clears the inherited default when the override is explicitly null', () => {
      const result = applyRefFieldOverride(libField, {
        $ref: 'lib_field',
        metadata: { default: null },
      });
      expect(result.metadata?.default).toBeUndefined();
    });
  });

  describe('resolveTemplateFields', () => {
    const makeLibDef = (name: string, defYaml: object): FieldDefinition => ({
      fieldDefinitionId: `fd-${name}`,
      name,
      owner: 'securitySolution',
      description: '',
      isGlobal: true,
      definition: yamlStringify(defYaml),
    });

    const libDefs: FieldDefinition[] = [
      makeLibDef('lib_text', {
        name: 'lib_text',
        type: 'keyword',
        control: 'INPUT_TEXT',
        metadata: { default: 'from_lib' },
      }),
    ];

    it('passes inline fields through unchanged', () => {
      const inline: Field = { name: 'inline', type: 'keyword', control: 'INPUT_TEXT' };
      expect(resolveTemplateFields([inline], libDefs)).toEqual([inline]);
    });

    it('resolves a $ref to its library default when no override is present', () => {
      const ref: RefField = { $ref: 'lib_text' };
      const [resolved] = resolveTemplateFields([ref], libDefs);
      expect(resolved.metadata?.default).toBe('from_lib');
    });

    it('applies a $ref metadata.default override over the library default', () => {
      const ref: RefField = { $ref: 'lib_text', metadata: { default: 'from_template' } };
      const [resolved] = resolveTemplateFields([ref], libDefs);
      expect(resolved.metadata?.default).toBe('from_template');
    });

    it('clears the library default when the $ref override is explicitly null', () => {
      const ref: RefField = { $ref: 'lib_text', metadata: { default: null } };
      const [resolved] = resolveTemplateFields([ref], libDefs);
      expect(resolved.metadata?.default).toBeUndefined();
    });

    it('drops a $ref that cannot be resolved in the library', () => {
      const ref: RefField = { $ref: 'unknown' };
      expect(resolveTemplateFields([ref], libDefs)).toEqual([]);
    });

    it('produces an empty extended-fields default for a null-cleared $ref', () => {
      const ref: RefField = { $ref: 'lib_text', metadata: { default: null } };
      const resolved = resolveTemplateFields([ref], libDefs);
      expect(buildExtendedFieldsDefaults(resolved)).toEqual({ lib_text_as_keyword: '' });
    });
  });

  describe('buildExtendedFieldsDefaults', () => {
    it('excludes display-only (MARKDOWN) fields — they hold no stored value', () => {
      const fields: InlineField[] = [
        { name: 'summary', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: 'hi' } },
        {
          name: 'instructions',
          type: 'keyword',
          control: 'MARKDOWN',
          metadata: { content: '# Do X' },
        },
      ];

      const defaults = buildExtendedFieldsDefaults(fields);

      expect(defaults).toEqual({ summary_as_keyword: 'hi' });
      expect(defaults).not.toHaveProperty('instructions_as_keyword');
    });
  });
});

describe('customFields → extended_fields adapter utilities', () => {
  describe('getV2FieldType', () => {
    it('maps number to integer', () => {
      expect(getV2FieldType('number')).toBe('integer');
    });

    it('maps text to keyword', () => {
      expect(getV2FieldType('text')).toBe('keyword');
    });

    it('maps toggle to boolean', () => {
      expect(getV2FieldType('toggle')).toBe('boolean');
    });

    it('maps unknown types to keyword', () => {
      expect(getV2FieldType('date')).toBe('keyword');
      expect(getV2FieldType('')).toBe('keyword');
    });
  });

  describe('buildExtendedFieldsBackfill', () => {
    it('returns an empty object when customFields is undefined or empty', () => {
      expect(buildExtendedFieldsBackfill(undefined, {})).toEqual({});
      expect(buildExtendedFieldsBackfill([], {})).toEqual({});
    });

    it('derives storage keys using <key>_as_<v2type>', () => {
      const result = buildExtendedFieldsBackfill(
        [
          { key: 'priority', type: 'text', value: 'high' },
          { key: 'count', type: 'number', value: 42 },
          { key: 'enabled', type: 'toggle', value: true },
        ],
        {}
      );

      expect(result).toEqual({
        priority_as_keyword: 'high',
        count_as_integer: '42',
        enabled_as_boolean: 'true',
      });
    });

    it('skips null and undefined values', () => {
      const result = buildExtendedFieldsBackfill(
        [
          { key: 'filled', type: 'text', value: 'yes' },
          { key: 'empty_null', type: 'text', value: null },
          { key: 'empty_undef', type: 'text', value: undefined },
        ],
        {}
      );

      expect(result).toEqual({ filled_as_keyword: 'yes' });
    });

    it('never overwrites a key already present in existingExtendedFields', () => {
      // FAILURE SCENARIO: adapter called twice on same case — second call must not
      // overwrite the value set by the first (existing-wins semantics).
      const result = buildExtendedFieldsBackfill(
        [{ key: 'priority', type: 'text', value: 'low' }],
        { priority_as_keyword: 'high' }
      );

      expect(result).toEqual({});
    });

    it('only returns the additions, not the full merged map', () => {
      const result = buildExtendedFieldsBackfill(
        [
          { key: 'priority', type: 'text', value: 'low' }, // already in existing — skipped
          { key: 'severity', type: 'text', value: 'medium' }, // new — added
        ],
        { priority_as_keyword: 'high' }
      );

      expect(result).toEqual({ severity_as_keyword: 'medium' });
      expect(result).not.toHaveProperty('priority_as_keyword');
    });

    it('treats null existingExtendedFields as empty', () => {
      const result = buildExtendedFieldsBackfill([{ key: 'x', type: 'text', value: 'v' }], null);

      expect(result).toEqual({ x_as_keyword: 'v' });
    });
  });

  describe('mergeCustomFieldsIntoExtendedFields', () => {
    it('adds a new key when no existing map is present', () => {
      const result = mergeCustomFieldsIntoExtendedFields(
        [{ key: 'priority', type: 'text', value: 'high' }],
        { existing_key_as_keyword: 'value' }
      );

      expect(result).toEqual({
        existing_key_as_keyword: 'value',
        priority_as_keyword: 'high',
      });
    });

    it('overrides an existing key when the customField value changes', () => {
      const result = mergeCustomFieldsIntoExtendedFields(
        [{ key: 'priority', type: 'text', value: 'low' }],
        { priority_as_keyword: 'high' }
      );

      expect(result).toEqual({ priority_as_keyword: 'low' });
    });

    it('overrides existing keys and adds new ones simultaneously', () => {
      const result = mergeCustomFieldsIntoExtendedFields(
        [
          { key: 'kept', type: 'text', value: 'updated' }, // customFields-win — overrides
          { key: 'new', type: 'number', value: 7 }, // added
        ],
        { kept_as_keyword: 'original' }
      );

      expect(result).toEqual({
        kept_as_keyword: 'updated', // overridden
        new_as_integer: '7', // added
      });
    });

    it('returns existingExtendedFields unchanged (same reference) when every value is identical', () => {
      // FAILURE SCENARIO: adapter returns a new object reference on every call even when
      // nothing changed — would trigger spurious SO writes and user-action entries.
      const existing = { priority_as_keyword: 'high' };
      const result = mergeCustomFieldsIntoExtendedFields(
        [{ key: 'priority', type: 'text', value: 'high' }], // same value — no-op
        existing
      );

      expect(result).toBe(existing); // same reference
    });

    it('returns undefined unchanged when customFields is empty and existing is undefined', () => {
      const result = mergeCustomFieldsIntoExtendedFields(undefined, undefined);
      expect(result).toBeUndefined();
    });

    it('returns null unchanged when customFields is empty and existing is null', () => {
      const result = mergeCustomFieldsIntoExtendedFields([], null);
      expect(result).toBeNull();
    });

    it('clears a mirror key when the customField value is null', () => {
      const result = mergeCustomFieldsIntoExtendedFields(
        [{ key: 'priority', type: 'text', value: null }],
        { priority_as_keyword: 'high', other_as_keyword: 'keep' }
      );

      expect(result).toEqual({ other_as_keyword: 'keep' });
      expect(result).not.toHaveProperty('priority_as_keyword');
    });

    it('clears a mirror key when the customField value is undefined', () => {
      const result = mergeCustomFieldsIntoExtendedFields(
        [{ key: 'priority', type: 'text', value: undefined }],
        { priority_as_keyword: 'high' }
      );

      expect(result).toEqual({});
      expect(result).not.toHaveProperty('priority_as_keyword');
    });

    it('is a no-op (same reference) when a null customField key is not present in existing', () => {
      const existing = { other_as_keyword: 'keep' };
      const result = mergeCustomFieldsIntoExtendedFields(
        [{ key: 'priority', type: 'text', value: null }], // key absent — nothing to delete
        existing
      );

      expect(result).toBe(existing); // same reference — no spurious write
    });

    it('produces a new map from undefined existing when customFields have values', () => {
      const result = mergeCustomFieldsIntoExtendedFields(
        [{ key: 'x', type: 'toggle', value: false }],
        undefined
      );

      expect(result).toEqual({ x_as_boolean: 'false' });
    });
  });
});
