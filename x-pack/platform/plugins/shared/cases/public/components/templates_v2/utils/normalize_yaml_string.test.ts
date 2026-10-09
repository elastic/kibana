/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeYamlString } from './normalize_yaml_string';

describe('normalizeYamlString', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeYamlString('')).toBe('');
  });

  it('normalizes CRLF to LF', () => {
    expect(normalizeYamlString('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('trims trailing whitespace from each line', () => {
    expect(normalizeYamlString('name: test  \nfields:   ')).toBe('name: test\nfields:');
  });

  it('trims trailing newlines', () => {
    expect(normalizeYamlString('a\nb\n\n\n')).toBe('a\nb');
  });

  it('preserves leading whitespace (indentation)', () => {
    expect(normalizeYamlString('fields:\n  - name: foo')).toBe('fields:\n  - name: foo');
  });

  it('handles a string that is already normalized', () => {
    const input = 'name: test\nfields:\n  - name: foo';
    expect(normalizeYamlString(input)).toBe(input);
  });

  it('handles mixed CRLF, trailing spaces, and trailing newlines', () => {
    expect(normalizeYamlString('a  \r\nb \r\nc\r\n\r\n')).toBe('a\nb\nc');
  });

  it('handles whitespace-only input', () => {
    expect(normalizeYamlString('   \n  \n  ')).toBe('');
  });

  it('handles single line with trailing space', () => {
    expect(normalizeYamlString('name: test   ')).toBe('name: test');
  });
});
