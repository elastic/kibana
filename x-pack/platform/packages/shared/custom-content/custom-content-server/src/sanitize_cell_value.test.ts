/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeCellValue } from './sanitize_cell_value';

describe('sanitizeCellValue', () => {
  it('converts non-string values to strings', () => {
    expect(sanitizeCellValue(42)).toBe('42');
    expect(sanitizeCellValue(null)).toBe('');
    expect(sanitizeCellValue(undefined)).toBe('');
  });

  it('strips HTML angle brackets', () => {
    expect(sanitizeCellValue('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('collapses line breaks into a single space', () => {
    expect(sanitizeCellValue('hello\nworld')).toBe('hello world');
    expect(sanitizeCellValue('hello\r\nworld')).toBe('hello world');
  });

  it('breaks Liquid output delimiters', () => {
    expect(sanitizeCellValue('{{ drop_table }}')).toBe('{ { drop_table }}');
  });

  it('breaks Liquid tag delimiters', () => {
    expect(sanitizeCellValue('{% for x in y %}')).toBe('{ % for x in y %}');
  });

  it('truncates values longer than 500 characters', () => {
    const long = 'a'.repeat(600);
    expect(sanitizeCellValue(long)).toHaveLength(500);
  });
});
