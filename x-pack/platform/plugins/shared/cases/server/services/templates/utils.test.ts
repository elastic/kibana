/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFieldDefinitions, trimFieldDefaults } from './utils';

describe('toFieldDefinitions', () => {
  it('maps fields to field definitions with label falling back to name', () => {
    const fields = [
      {
        name: 'field_one',
        label: 'Field One',
        type: 'keyword' as const,
        control: 'INPUT_TEXT' as const,
      },
      { name: 'field_two', type: 'keyword' as const, control: 'TEXTAREA' as const },
    ];

    expect(toFieldDefinitions(fields)).toEqual([
      { name: 'field_one', label: 'Field One', type: 'keyword', control: 'INPUT_TEXT' },
      { name: 'field_two', label: 'field_two', type: 'keyword', control: 'TEXTAREA' },
    ]);
  });

  it('returns an empty array when given no fields', () => {
    expect(toFieldDefinitions([])).toEqual([]);
  });
});

describe('trimFieldDefaults', () => {
  it('trims leading and trailing whitespace from string defaults', () => {
    const yaml = `name: Test
fields:
  - name: summary
    label: Summary
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: "  hello  "
`;

    const result = trimFieldDefaults(yaml);
    expect(result).not.toContain('  hello  ');
    expect(result).toMatch(/default: "?hello"?/);
  });

  it('trims defaults with only trailing whitespace', () => {
    const yaml = `name: Test
fields:
  - name: region
    label: Region
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: "Production "
`;

    const result = trimFieldDefaults(yaml);
    expect(result).not.toContain('Production ');
    expect(result).toMatch(/default: "?Production"?/);
  });

  it('does not modify defaults that have no whitespace to trim', () => {
    const yaml = `name: Test
fields:
  - name: region
    label: Region
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: Production
`;

    const result = trimFieldDefaults(yaml);
    expect(result).toBe(yaml);
  });

  it('does not modify numeric defaults', () => {
    const yaml = `name: Test
fields:
  - name: count
    label: Count
    control: INPUT_NUMBER
    type: long
    metadata:
      default: 42
`;

    const result = trimFieldDefaults(yaml);
    expect(result).toContain('default: 42');
  });

  it('does not modify array defaults', () => {
    const yaml = `name: Test
fields:
  - name: components
    label: Components
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      default:
        - API
        - UI
`;

    const result = trimFieldDefaults(yaml);
    expect(result).toContain('- API');
    expect(result).toContain('- UI');
  });

  it('handles fields without metadata gracefully', () => {
    const yaml = `name: Test
fields:
  - name: summary
    label: Summary
    control: INPUT_TEXT
    type: keyword
`;

    const result = trimFieldDefaults(yaml);
    expect(result).toBe(yaml);
  });

  it('handles fields with metadata but no default', () => {
    const yaml = `name: Test
fields:
  - name: region
    label: Region
    control: SELECT_BASIC
    type: keyword
    metadata:
      options:
        - us-east-1
        - eu-west-1
`;

    const result = trimFieldDefaults(yaml);
    expect(result).toBe(yaml);
  });

  it('returns the original string for empty input', () => {
    expect(trimFieldDefaults('')).toBe('');
  });

  it('returns the original string for invalid YAML', () => {
    const invalid = '{{not valid yaml:::';
    expect(trimFieldDefaults(invalid)).toBe(invalid);
  });

  it('preserves comments in the YAML', () => {
    const yaml = `name: Test
# This is an important template
fields:
  - name: summary
    label: Summary
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: "  trimme  "
`;

    const result = trimFieldDefaults(yaml);
    expect(result).toContain('# This is an important template');
    expect(result).not.toContain('  trimme  ');
    expect(result).toMatch(/default: "?trimme"?/);
  });

  it('trims multiple fields in one pass', () => {
    const yaml = `name: Test
fields:
  - name: field_a
    label: Field A
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: " alpha "
  - name: field_b
    label: Field B
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: "beta  "
`;

    const result = trimFieldDefaults(yaml);
    expect(result).not.toContain(' alpha ');
    expect(result).not.toContain('beta  ');
    expect(result).toMatch(/default: "?alpha"?/);
    expect(result).toMatch(/default: "?beta"?/);
  });
});
