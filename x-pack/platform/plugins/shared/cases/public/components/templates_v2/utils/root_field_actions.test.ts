/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import { buildFieldScaffold } from './template_field_actions';
import { applyRootFieldBlock, getRootFieldControl, replaceRootField } from './root_field_actions';

const FIELD = `name: root_cause
control: INPUT_TEXT
label: Root cause
type: keyword
`;

// A tab used for indentation makes the document error-bearing but still parseable — the transient
// state where `doc.toString()` would throw.
const WITH_ERRORS = 'name: a\n\tcontrol: INPUT_TEXT';

describe('getRootFieldControl', () => {
  it('resolves the root field control and name', () => {
    expect(getRootFieldControl(FIELD)).toEqual({ control: 'INPUT_TEXT', name: 'root_cause' });
  });

  it('returns null for empty and whitespace-only buffers', () => {
    expect(getRootFieldControl('')).toBeNull();
    expect(getRootFieldControl('   \n  ')).toBeNull();
  });

  it('returns null when the root is not a map or has no control', () => {
    expect(getRootFieldControl('- a\n- b')).toBeNull();
    expect(getRootFieldControl('just a scalar')).toBeNull();
    expect(getRootFieldControl('name: root_cause\nlabel: No control')).toBeNull();
  });

  it('returns null (never throws) on an error-bearing buffer', () => {
    expect(getRootFieldControl(WITH_ERRORS)).toBeNull();
  });

  it('omits name when the root field is unnamed', () => {
    expect(getRootFieldControl('control: TOGGLE\ntype: boolean')).toEqual({
      control: 'TOGGLE',
      name: undefined,
    });
  });
});

describe('replaceRootField', () => {
  it('writes a scaffold into an empty buffer', () => {
    const scaffold = buildFieldScaffold('INPUT_TEXT')!;
    const result = replaceRootField('', scaffold);
    expect(result.status).toBe('applied');
    const parsed = parseYaml(result.yaml);
    expect(parsed.control).toBe('INPUT_TEXT');
    expect(parsed.fields).toBeUndefined();
  });

  it('replaces an existing field wholesale — nothing from the prior definition survives', () => {
    const scaffold = buildFieldScaffold('TOGGLE')!;
    const result = replaceRootField(FIELD, scaffold);
    expect(result.status).toBe('applied');
    const parsed = parseYaml(result.yaml);
    expect(parsed.control).toBe('TOGGLE');
    expect(result.yaml).not.toContain('Root cause');
    expect(result.yaml).not.toContain('keyword');
  });

  it('no-ops with status "invalid" and never throws on an error-bearing buffer', () => {
    const result = replaceRootField(WITH_ERRORS, buildFieldScaffold('INPUT_TEXT')!);
    expect(result.status).toBe('invalid');
    expect(result.yaml).toBe(WITH_ERRORS);
  });
});

describe('applyRootFieldBlock', () => {
  it('creates the block and adds the rule', () => {
    const result = applyRootFieldBlock(FIELD, 'validation', 'required', true);
    expect(result.status).toBe('applied');
    expect(parseYaml(result.yaml).validation).toEqual({ required: true });
  });

  it('adds to an existing block without disturbing its other rules', () => {
    const withBlock = `${FIELD}validation:\n  min_length: 3\n`;
    const result = applyRootFieldBlock(withBlock, 'validation', 'required', true);
    expect(result.status).toBe('applied');
    expect(parseYaml(result.yaml).validation).toEqual({ min_length: 3, required: true });
  });

  it('returns "exists" and leaves an authored value untouched', () => {
    const withRule = `${FIELD}validation:\n  required: false\n`;
    const result = applyRootFieldBlock(withRule, 'validation', 'required', true);
    expect(result.status).toBe('exists');
    expect(result.yaml).toBe(withRule);
  });

  it('returns "no-field" for empty buffers and roots without a control', () => {
    expect(applyRootFieldBlock('', 'validation', 'required', true).status).toBe('no-field');
    expect(applyRootFieldBlock('name: a', 'validation', 'required', true).status).toBe('no-field');
  });

  it('no-ops with status "invalid" on an error-bearing buffer', () => {
    const result = applyRootFieldBlock(WITH_ERRORS, 'validation', 'required', true);
    expect(result.status).toBe('invalid');
    expect(result.yaml).toBe(WITH_ERRORS);
  });
});
