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
  collectNormalizedRefNames,
  diffExtendedFields,
  excludeRefFieldsToDefinitions,
  getAuthorableFieldNameViolation,
  getFieldCamelKey,
  getFieldSnakeKey,
  getFoldedFieldName,
  getV2FieldType,
  getYamlDefaultAsString,
  normalizeFieldDefinitionName,
  parseFieldDefinitionsToInlineFields,
  pickExtendedFieldsDifferingFromDefaults,
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

  describe('getFoldedFieldName', () => {
    it('folds hyphen, underscore, and camelCase spellings onto the same form', () => {
      expect(getFoldedFieldName('my-field')).toBe('myField');
      expect(getFoldedFieldName('my_field')).toBe('myField');
      expect(getFoldedFieldName('myField')).toBe('myField');
    });

    it('names with equal folds produce equal camel read keys for the same type', () => {
      // The load-bearing claim behind the twin check: if two names fold together, the UI
      // reads their values through the same camel key.
      expect(getFieldCamelKey('my-field', 'keyword')).toBe(getFieldCamelKey('my_field', 'keyword'));
    });
  });

  describe('getAuthorableFieldNameViolation', () => {
    it('returns null for a clean snake_case name', () => {
      expect(getAuthorableFieldNameViolation('risk_score', 'keyword')).toBeNull();
    });

    it('returns "charset" for a name with characters outside the authoring charset', () => {
      expect(getAuthorableFieldNameViolation('risk-score', 'keyword')).toBe('charset');
      expect(getAuthorableFieldNameViolation('bad name', 'keyword')).toBe('charset');
    });

    it('returns "length" when the derived key exceeds the maximum', () => {
      expect(getAuthorableFieldNameViolation('a'.repeat(300), 'keyword')).toBe('length');
    });

    it('reports charset before length when both are violated', () => {
      expect(getAuthorableFieldNameViolation(`${'a'.repeat(300)}-x`, 'keyword')).toBe('charset');
    });
  });

  describe('normalizeFieldDefinitionName', () => {
    it('lowercases and trims', () => {
      expect(normalizeFieldDefinitionName('  My_Field ')).toBe('my_field');
    });

    it('leaves an already-normalized name unchanged', () => {
      expect(normalizeFieldDefinitionName('my_field')).toBe('my_field');
    });
  });

  describe('collectNormalizedRefNames', () => {
    it('returns an empty set for undefined fields', () => {
      expect(collectNormalizedRefNames(undefined)).toEqual(new Set());
    });

    it('returns an empty set when there are no ref fields', () => {
      const fields: Field[] = [{ name: 'hostname', control: 'INPUT_TEXT', type: 'keyword' }];
      expect(collectNormalizedRefNames(fields)).toEqual(new Set());
    });

    it('collects normalized (trimmed, lowercased) $ref names', () => {
      const fields: Field[] = [{ $ref: '  SLA_Tier ' }, { $ref: 'cf_text' }];
      expect(collectNormalizedRefNames(fields)).toEqual(new Set(['sla_tier', 'cf_text']));
    });

    it('ignores inline fields and only collects ref fields', () => {
      const fields: Field[] = [
        { $ref: 'sla_tier' },
        { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword' },
      ];
      expect(collectNormalizedRefNames(fields)).toEqual(new Set(['sla_tier']));
    });

    it('deduplicates refs that only differ in case', () => {
      const fields: Field[] = [{ $ref: 'SLA_Tier' }, { $ref: 'sla_tier' }];
      expect(collectNormalizedRefNames(fields)).toEqual(new Set(['sla_tier']));
    });
  });

  describe('excludeRefFieldsToDefinitions', () => {
    it('returns an empty array for undefined fields', () => {
      expect(excludeRefFieldsToDefinitions(undefined, new Set(['sla_tier']))).toEqual([]);
    });

    it('drops only $ref entries targeting an excluded definition', () => {
      const fields: Field[] = [
        { $ref: 'sla_tier' },
        { $ref: 'other_field' },
        { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword' },
      ];
      expect(excludeRefFieldsToDefinitions(fields, new Set(['sla_tier']))).toEqual([
        { $ref: 'other_field' },
        { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword' },
      ]);
    });

    it('matches $refs case-insensitively (normalized names)', () => {
      const fields: Field[] = [{ $ref: '  SLA_Tier ' }];
      expect(excludeRefFieldsToDefinitions(fields, new Set(['sla_tier']))).toEqual([]);
    });

    it('keeps an inline field whose name matches an excluded definition', () => {
      // Inline fields are template-local, not references to the excluded library definition.
      const fields: Field[] = [{ name: 'sla_tier', control: 'INPUT_TEXT', type: 'keyword' }];
      expect(excludeRefFieldsToDefinitions(fields, new Set(['sla_tier']))).toEqual(fields);
    });

    it('returns all fields when the exclusion set is empty', () => {
      const fields: Field[] = [
        { $ref: 'sla_tier' },
        { name: 'hostname', control: 'INPUT_TEXT', type: 'keyword' },
      ];
      expect(excludeRefFieldsToDefinitions(fields, new Set())).toEqual(fields);
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

    const showWhen = {
      combine: 'all' as const,
      rules: [{ field: 'toggle_field', operator: 'eq' as const, value: true }],
    };

    it('applies a local display.show_when override onto a $ref field', () => {
      const result = applyRefFieldOverride(libField, {
        $ref: 'lib_field',
        display: { show_when: showWhen },
      });
      expect(result.display?.show_when).toEqual(showWhen);
    });

    it('applies a local validation.required_when override onto a $ref field', () => {
      const result = applyRefFieldOverride(libField, {
        $ref: 'lib_field',
        validation: { required_when: showWhen },
      });
      expect(result.validation?.required_when).toEqual(showWhen);
    });

    it('leaves display/validation untouched when the $ref has no override', () => {
      const result = applyRefFieldOverride(libField, { $ref: 'lib_field' });
      expect(result.display).toBeUndefined();
      expect(result.validation).toBeUndefined();
    });

    describe('validation merge', () => {
      const libFieldWithValidation: InlineField = {
        ...libField,
        validation: {
          required: true,
          pattern: { regex: '^[a-z]+$' },
          min_length: 2,
          max_length: 10,
        },
      };

      it('preserves the library format constraints when the override only sets an unrelated key', () => {
        const result = applyRefFieldOverride(libFieldWithValidation, {
          $ref: 'lib_field',
          validation: { max_length: 20 },
        });
        expect(result.validation).toEqual({
          required: true,
          pattern: { regex: '^[a-z]+$' },
          min_length: 2,
          max_length: 20,
        });
      });

      it('drops the library required-family keys when the override defines a different required* key', () => {
        const result = applyRefFieldOverride(libFieldWithValidation, {
          $ref: 'lib_field',
          validation: { required_when: showWhen },
        });
        expect(result.validation).toEqual({
          required_when: showWhen,
          pattern: { regex: '^[a-z]+$' },
          min_length: 2,
          max_length: 10,
        });
        expect(result.validation?.required).toBeUndefined();
      });

      it('drops the library required-family keys even when the override sets required_on_close only', () => {
        const result = applyRefFieldOverride(libFieldWithValidation, {
          $ref: 'lib_field',
          validation: { required_on_close: true },
        });
        expect(result.validation?.required).toBeUndefined();
        expect(result.validation?.required_when).toBeUndefined();
        expect(result.validation?.required_on_close).toBe(true);
        expect(result.validation?.pattern).toEqual({ regex: '^[a-z]+$' });
      });

      it('lets the override redeclare required alongside other required* keys unchanged by it', () => {
        const result = applyRefFieldOverride(libFieldWithValidation, {
          $ref: 'lib_field',
          validation: { required: false },
        });
        expect(result.validation).toEqual({
          required: false,
          pattern: { regex: '^[a-z]+$' },
          min_length: 2,
          max_length: 10,
        });
      });
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

    it('resolves a $ref that differs from the library name only in case', () => {
      const ref: RefField = { $ref: 'LIB_Text' };
      const [resolved] = resolveTemplateFields([ref], libDefs);
      expect(resolved).toBeDefined();
      expect(resolved.metadata?.default).toBe('from_lib');
    });

    it('keys extended-fields under the legacy key when a case-insensitive $ref carries a name alias', () => {
      const caseInsensitiveLibDefs = [
        makeLibDef('CF_Text', {
          name: 'CF_Text',
          type: 'keyword',
          control: 'INPUT_TEXT',
          metadata: { default: 'from_lib' },
        }),
      ];
      // A `name` alias composes with case-insensitive $ref resolution: the ref resolves
      // to the library definition, the alias controls the resolved field's storage key.
      const ref: RefField = { $ref: 'CF_Text', name: 'cf_text' };
      const resolved = resolveTemplateFields([ref], caseInsensitiveLibDefs);
      expect(buildExtendedFieldsDefaults(resolved)).toEqual({ cf_text_as_keyword: 'from_lib' });
    });

    it('preserves a local display.show_when authored on a $ref entry (regression: previously silently dropped)', () => {
      const showWhen = {
        combine: 'all' as const,
        rules: [{ field: 'open_tuning_request', operator: 'eq' as const, value: true }],
      };
      const ref: RefField = { $ref: 'lib_text', display: { show_when: showWhen } };
      const [resolved] = resolveTemplateFields([ref], libDefs);
      expect(resolved.display?.show_when).toEqual(showWhen);
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

  describe('pickExtendedFieldsDifferingFromDefaults', () => {
    it('returns an empty object when every persisted value matches its default', () => {
      expect(
        pickExtendedFieldsDifferingFromDefaults(
          { priority_as_keyword: 'medium', effort_as_integer: '' },
          { priority_as_keyword: 'medium', effort_as_integer: '' }
        )
      ).toEqual({});
    });

    it('keeps a non-empty override that differs from the default', () => {
      expect(
        pickExtendedFieldsDifferingFromDefaults(
          { priority_as_keyword: 'high', effort_as_integer: '' },
          { priority_as_keyword: 'medium', effort_as_integer: '' }
        )
      ).toEqual({ priority_as_keyword: 'high' });
    });

    it('keeps clearing a non-empty default as an empty-string entry', () => {
      expect(
        pickExtendedFieldsDifferingFromDefaults(
          { priority_as_keyword: '' },
          { priority_as_keyword: 'medium' }
        )
      ).toEqual({ priority_as_keyword: '' });
    });

    it('drops empty persisted values when the default is also empty', () => {
      expect(
        pickExtendedFieldsDifferingFromDefaults(
          { effort_as_integer: '' },
          { effort_as_integer: '' }
        )
      ).toEqual({});
    });

    it('keeps a persisted key with no default when its value is non-empty', () => {
      expect(pickExtendedFieldsDifferingFromDefaults({ notes_as_keyword: 'hello' }, {})).toEqual({
        notes_as_keyword: 'hello',
      });
    });

    it('drops a persisted key with no default when its value is empty', () => {
      expect(pickExtendedFieldsDifferingFromDefaults({ notes_as_keyword: '' }, {})).toEqual({});
    });
  });

  describe('diffExtendedFields', () => {
    it('returns empty diff when both sides are null/undefined', () => {
      expect(diffExtendedFields(null, undefined)).toEqual({ changedFields: [] });
    });

    it('returns empty diff when both sides are empty objects', () => {
      expect(diffExtendedFields({}, {})).toEqual({ changedFields: [] });
    });

    it('returns empty diff for identical maps', () => {
      expect(diffExtendedFields({ a: 'x', b: 'y' }, { a: 'x', b: 'y' })).toEqual({
        changedFields: [],
      });
    });

    it('detects a modified key', () => {
      const result = diffExtendedFields({ priority: 'low' }, { priority: 'high' });
      expect(result.changedFields).toEqual(['priority']);
    });

    it('detects an added key (absent → value)', () => {
      const result = diffExtendedFields({}, { priority: 'high' });
      expect(result.changedFields).toEqual(['priority']);
    });

    it('detects a removed key (value → absent)', () => {
      const result = diffExtendedFields({ priority: 'high' }, {});
      expect(result.changedFields).toEqual(['priority']);
    });

    it('treats absent → empty-string as a change', () => {
      const result = diffExtendedFields({}, { priority: '' });
      expect(result.changedFields).toEqual(['priority']);
    });

    it('treats empty-string → absent as a change', () => {
      const result = diffExtendedFields({ priority: '' }, {});
      expect(result.changedFields).toEqual(['priority']);
    });

    it('treats empty-string → non-empty as a change', () => {
      const result = diffExtendedFields({ priority: '' }, { priority: 'high' });
      expect(result.changedFields).toEqual(['priority']);
    });

    it('treats non-empty → empty-string as a change', () => {
      const result = diffExtendedFields({ priority: 'high' }, { priority: '' });
      expect(result.changedFields).toEqual(['priority']);
    });

    it('does not report unchanged sibling keys', () => {
      const result = diffExtendedFields(
        { priority: 'low', severity: 'medium' },
        { priority: 'high', severity: 'medium' }
      );
      expect(result.changedFields).toEqual(['priority']);
    });

    it('returns changedFields sorted alphabetically', () => {
      const result = diffExtendedFields({ c: '1', a: '2', b: '3' }, { c: 'x', a: 'y', b: 'z' });
      expect(result.changedFields).toEqual(['a', 'b', 'c']);
    });

    it('treats own key with undefined value as absent', () => {
      const prev: Record<string, unknown> = {};
      Object.defineProperty(prev, 'priority', { value: undefined, enumerable: true });
      const result = diffExtendedFields(prev, { priority: 'high' });
      expect(result.changedFields).toEqual(['priority']);
    });

    it('ignores inherited properties', () => {
      const proto = { inherited_key: 'should-be-ignored' };
      const prev = Object.create(proto) as Record<string, unknown>;
      prev.priority = 'low';
      const result = diffExtendedFields(prev, { priority: 'low' });
      expect(result.changedFields).toEqual([]);
    });

    it('coerces numeric values via String() — equal after coercion is not a change', () => {
      const result = diffExtendedFields({ count: 5 }, { count: '5' });
      expect(result.changedFields).toEqual([]);
    });

    it('coerces numeric values via String() — different after coercion is a change', () => {
      const result = diffExtendedFields({ count: 5 }, { count: '6' });
      expect(result.changedFields).toEqual(['count']);
    });

    it('coerces boolean values', () => {
      const result = diffExtendedFields({ flag: true }, { flag: 'true' });
      expect(result.changedFields).toEqual([]);
    });

    it('handles null previous as empty map', () => {
      const result = diffExtendedFields(null, { priority: 'high' });
      expect(result.changedFields).toEqual(['priority']);
    });

    it('handles undefined next as empty map', () => {
      const result = diffExtendedFields({ priority: 'high' }, undefined);
      expect(result.changedFields).toEqual(['priority']);
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
    // Most of these tests exercise value/precedence semantics independent of key derivation, so
    // they resolve every field to its raw-key-based storage key (matching pre-friendly-name
    // behavior) via this stub resolver. Dedicated tests below cover link-resolution itself.
    const rawKeyBackfill = (
      customFields: Array<{ key: string; type: string; value: unknown }> | undefined,
      existingExtendedFields: Record<string, unknown> | null | undefined
    ) =>
      buildExtendedFieldsBackfill(customFields, existingExtendedFields, (cf) =>
        getFieldSnakeKey(cf.key, getV2FieldType(cf.type))
      );

    it('returns an empty object when customFields is undefined or empty', () => {
      expect(rawKeyBackfill(undefined, {})).toEqual({});
      expect(rawKeyBackfill([], {})).toEqual({});
    });

    it('skips a field with no resolvable storage key rather than guessing', () => {
      const result = buildExtendedFieldsBackfill(
        [{ key: 'unresolved', type: 'text', value: 'x' }],
        {},
        () => undefined
      );

      expect(result).toEqual({});
    });

    it('uses the resolver-provided storage key, not the raw legacy key', () => {
      const result = buildExtendedFieldsBackfill(
        [{ key: 'raw_v1_key', type: 'text', value: 'hello' }],
        {},
        () => 'friendly_name_as_keyword'
      );

      expect(result).toEqual({ friendly_name_as_keyword: 'hello' });
    });

    it('derives storage keys using <key>_as_<v2type>', () => {
      const result = rawKeyBackfill(
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
      const result = rawKeyBackfill(
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
      const result = rawKeyBackfill([{ key: 'priority', type: 'text', value: 'low' }], {
        priority_as_keyword: 'high',
      });

      expect(result).toEqual({});
    });

    it('only returns the additions, not the full merged map', () => {
      const result = rawKeyBackfill(
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
      const result = rawKeyBackfill([{ key: 'x', type: 'text', value: 'v' }], null);

      expect(result).toEqual({ x_as_keyword: 'v' });
    });

    it('does NOT fill a key whose existing value is the empty string (deliberate clear preserved)', () => {
      // The v2 UI persists '' both for untouched fields and for fields the user explicitly
      // cleared, and the migration runs asynchronously — field definitions become visible
      // before a space's backfill completes, so a '' observed at backfill time may be a
      // deliberate clear. It is ambiguous, so it must never be overwritten with the stale
      // legacy value.
      const result = rawKeyBackfill([{ key: 'priority', type: 'text', value: 'low' }], {
        priority_as_keyword: '',
      });

      expect(result).toEqual({});
    });

    it('fills a key whose existing value is null', () => {
      const result = rawKeyBackfill([{ key: 'priority', type: 'text', value: 'low' }], {
        priority_as_keyword: null,
      });

      expect(result).toEqual({ priority_as_keyword: 'low' });
    });

    it('does not fill a key whose existing value is a non-empty string', () => {
      const result = rawKeyBackfill(
        [
          { key: 'kept', type: 'text', value: 'legacy' },
          { key: 'zero', type: 'number', value: 1 },
          { key: 'flag', type: 'toggle', value: true },
        ],
        { kept_as_keyword: 'v2-value', zero_as_integer: '0', flag_as_boolean: 'false' }
      );

      // '0' and 'false' are real (falsy-looking) v2 values and must win over the legacy mirror.
      expect(result).toEqual({});
    });
  });
});
