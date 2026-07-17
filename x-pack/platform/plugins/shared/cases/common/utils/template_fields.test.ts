/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import {
  applyRefFieldOverride,
  buildExtendedFieldsDefaults,
  getFieldCamelKey,
  getFieldSnakeKey,
  getYamlDefaultAsString,
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
