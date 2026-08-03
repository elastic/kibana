/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import {
  applyFieldBlock,
  buildFieldScaffold,
  getFieldControlAtLine,
  hasTemplateParseErrors,
  insertTemplateField,
  stripSnippetPlaceholders,
} from './template_field_actions';

const TEMPLATE = `name: My template
severity: low
fields:
  - name: summary
    control: INPUT_TEXT
    label: Summary
    type: keyword
  - name: escalate
    control: TOGGLE
    label: Escalate
    type: boolean
    metadata:
      default: false
`;

// Line map (1-based) for TEMPLATE:
// 1 name, 2 severity, 3 fields:, 4-7 summary field, 8-13 escalate field

describe('stripSnippetPlaceholders', () => {
  it('reduces tab-stop placeholders to their bare text', () => {
    expect(stripSnippetPlaceholders('${1:field_name}')).toBe('field_name');
    expect(stripSnippetPlaceholders('${3:integer}')).toBe('integer');
  });

  it('leaves non-placeholder scalars, booleans, and numbers untouched', () => {
    expect(stripSnippetPlaceholders('keyword')).toBe('keyword');
    expect(stripSnippetPlaceholders(false)).toBe(false);
    expect(stripSnippetPlaceholders(7)).toBe(7);
  });

  it('recurses through arrays and objects', () => {
    expect(
      stripSnippetPlaceholders({
        name: '${1:field_name}',
        metadata: { options: ['${3:option_1}', '${4:option_2}'] },
      })
    ).toEqual({ name: 'field_name', metadata: { options: ['option_1', 'option_2'] } });
  });

  it('strips every tab-stop in a multi-placeholder or embedded string', () => {
    expect(stripSnippetPlaceholders('${1:a} and ${2:b}')).toBe('a and b');
    expect(stripSnippetPlaceholders('prefix ${1:x} suffix')).toBe('prefix x suffix');
  });
});

describe('parse-error guards', () => {
  // A tab used for indentation makes the document error-bearing but still parseable, which is exactly
  // the transient state that would otherwise make `doc.toString()` throw.
  const withTab = 'name: T\nfields:\n\t- name: a';
  const unclosedFlow = 'name: T\nfields: [ {name: a';

  it('hasTemplateParseErrors flags error-bearing buffers but not empty/valid ones', () => {
    expect(hasTemplateParseErrors(withTab)).toBe(true);
    expect(hasTemplateParseErrors(unclosedFlow)).toBe(true);
    expect(hasTemplateParseErrors('')).toBe(false);
    expect(hasTemplateParseErrors(TEMPLATE)).toBe(false);
  });

  it('insertTemplateField no-ops with reason "invalid" and never throws on error-bearing YAML', () => {
    const result = insertTemplateField(withTab, buildFieldScaffold('INPUT_TEXT')!, 1);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('invalid');
    expect(result.yaml).toBe(withTab);
  });

  it('applyFieldBlock returns "invalid" and never throws on error-bearing YAML', () => {
    const result = applyFieldBlock(unclosedFlow, 3, 'validation', 'required', true);
    expect(result.status).toBe('invalid');
    expect(result.yaml).toBe(unclosedFlow);
  });

  it('getFieldControlAtLine returns null for error-bearing YAML', () => {
    expect(getFieldControlAtLine(withTab, 3)).toBeNull();
  });
});

describe('buildFieldScaffold', () => {
  it('derives a valid scaffold for every control from the snippet catalog', () => {
    const text = buildFieldScaffold('INPUT_TEXT');
    expect(text).toEqual({
      name: 'field_name',
      label: 'Label',
      control: 'INPUT_TEXT',
      type: 'keyword',
    });

    const select = buildFieldScaffold('SELECT_BASIC');
    expect(select).toMatchObject({
      control: 'SELECT_BASIC',
      metadata: { options: ['option_1', 'option_2'] },
    });
  });

  it('returns a fresh object each call (no shared mutation)', () => {
    const a = buildFieldScaffold('INPUT_TEXT');
    const b = buildFieldScaffold('INPUT_TEXT');
    expect(a).not.toBe(b);
  });

  it('returns null for an unknown control', () => {
    expect(buildFieldScaffold('NOT_A_CONTROL')).toBeNull();
  });
});

describe('getFieldControlAtLine', () => {
  it('resolves the inline field entry under the cursor', () => {
    expect(getFieldControlAtLine(TEMPLATE, 5)).toEqual({ control: 'INPUT_TEXT', name: 'summary' });
    expect(getFieldControlAtLine(TEMPLATE, 10)).toEqual({ control: 'TOGGLE', name: 'escalate' });
  });

  it('returns null when the cursor is above fields (case data) or on the fields header', () => {
    expect(getFieldControlAtLine(TEMPLATE, 1)).toBeNull();
    expect(getFieldControlAtLine(TEMPLATE, 3)).toBeNull();
  });

  it('returns null for empty or malformed content', () => {
    expect(getFieldControlAtLine('', 1)).toBeNull();
    expect(getFieldControlAtLine(':::not yaml', 1)).toBeNull();
  });
});

describe('insertTemplateField', () => {
  it('appends a new field when the cursor is not inside fields', () => {
    const result = insertTemplateField(TEMPLATE, buildFieldScaffold('INPUT_NUMBER')!, 1);
    expect(result.changed).toBe(true);
    const parsed = parseYaml(result.yaml);
    expect(parsed.fields).toHaveLength(3);
    expect(parsed.fields[2]).toMatchObject({ name: 'field_name', control: 'INPUT_NUMBER' });
  });

  it('inserts directly after the field entry the cursor sits on', () => {
    const result = insertTemplateField(TEMPLATE, buildFieldScaffold('INPUT_NUMBER')!, 5);
    const parsed = parseYaml(result.yaml);
    // summary (0), new field (1), escalate (2)
    expect(parsed.fields[1]).toMatchObject({ control: 'INPUT_NUMBER' });
    expect(parsed.fields[2]).toMatchObject({ name: 'escalate' });
  });

  it('uniquifies a colliding inline name', () => {
    const once = insertTemplateField(TEMPLATE, { name: 'summary', control: 'INPUT_TEXT' }, 1);
    const parsed = parseYaml(once.yaml);
    expect(parsed.fields[2].name).toBe('summary_2');
    expect(once.insertedName).toBe('summary_2');
  });

  it('preserves existing comments and formatting', () => {
    const withComment = `# top comment\nfields:\n  - name: a\n    control: INPUT_TEXT\n`;
    const result = insertTemplateField(withComment, buildFieldScaffold('TOGGLE')!, 99);
    expect(result.yaml).toContain('# top comment');
  });

  it('links a $ref and is a no-op when the same $ref is already present', () => {
    const linked = insertTemplateField(TEMPLATE, { $ref: 'root_cause' }, 1);
    expect(linked.changed).toBe(true);
    expect(parseYaml(linked.yaml).fields).toHaveLength(3);

    const again = insertTemplateField(linked.yaml, { $ref: 'root_cause' }, 1);
    expect(again.changed).toBe(false);
    expect(again.yaml).toBe(linked.yaml);
  });

  it('creates a fields block when none exists', () => {
    const noFields = `name: T\nseverity: low\n`;
    const result = insertTemplateField(noFields, buildFieldScaffold('INPUT_TEXT')!, 1);
    expect(result.changed).toBe(true);
    expect(parseYaml(result.yaml).fields).toHaveLength(1);
  });

  it('initializes a map for an empty buffer', () => {
    const result = insertTemplateField('', buildFieldScaffold('INPUT_TEXT')!);
    expect(result.changed).toBe(true);
    expect(parseYaml(result.yaml).fields).toHaveLength(1);
  });
});

describe('applyFieldBlock', () => {
  it('adds a validation rule to the field under the cursor', () => {
    const result = applyFieldBlock(TEMPLATE, 5, 'validation', 'required', true);
    expect(result.status).toBe('applied');
    expect(result.fieldName).toBe('summary');
    expect(parseYaml(result.yaml).fields[0].validation).toEqual({ required: true });
  });

  it('adds a display block, creating it when absent', () => {
    const cond = { field: 'escalate', operator: 'eq', value: true };
    const result = applyFieldBlock(TEMPLATE, 5, 'display', 'show_when', cond);
    expect(result.status).toBe('applied');
    expect(parseYaml(result.yaml).fields[0].display).toEqual({ show_when: cond });
  });

  it('returns no-field when the cursor is not on an inline field', () => {
    expect(applyFieldBlock(TEMPLATE, 1, 'validation', 'required', true).status).toBe('no-field');
    expect(applyFieldBlock(TEMPLATE, 3, 'validation', 'required', true).status).toBe('no-field');
  });

  it('leaves an already-set rule untouched (exists)', () => {
    const first = applyFieldBlock(TEMPLATE, 5, 'validation', 'required', true);
    const second = applyFieldBlock(first.yaml, 5, 'validation', 'required', false);
    expect(second.status).toBe('exists');
    expect(second.yaml).toBe(first.yaml);
    expect(parseYaml(first.yaml).fields[0].validation.required).toBe(true);
  });
});
