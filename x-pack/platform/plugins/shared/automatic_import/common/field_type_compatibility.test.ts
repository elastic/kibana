/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldTypeCompatibility, getFieldValue } from './field_type_compatibility';

describe('getFieldTypeCompatibility', () => {
  it('treats numbers going into keyword as compatible', () => {
    expect(getFieldTypeCompatibility('keyword', [1, 'a', true])).toEqual({
      status: 'compatible',
      failingDocuments: 0,
      totalDocuments: 3,
    });
  });

  it('treats numeric strings and fractions going into long as compatible', () => {
    expect(getFieldTypeCompatibility('long', ['42', 7, 1.5]).status).toBe('compatible');
  });

  it('reports values Elasticsearch would reject as certain failures', () => {
    expect(getFieldTypeCompatibility('short', [['Unknown Generic Log Event']])).toEqual({
      status: 'certain_failure',
      issue: 'not_numeric',
      failingDocuments: 1,
      totalDocuments: 1,
    });
    expect(getFieldTypeCompatibility('double', [true]).issue).toBe('not_numeric');
    expect(getFieldTypeCompatibility('ip', ['nope']).issue).toBe('not_ip');
    expect(getFieldTypeCompatibility('boolean', ['maybe']).issue).toBe('not_boolean');
  });

  it('accepts values Elasticsearch coerces', () => {
    expect(getFieldTypeCompatibility('boolean', [true, 'false', '']).status).toBe('compatible');
    expect(getFieldTypeCompatibility('ip', ['10.0.0.1', '2001:db8::1']).status).toBe('compatible');
    expect(getFieldTypeCompatibility('float', ['1.5', 2]).status).toBe('compatible');
  });

  it('does not check dates', () => {
    expect(getFieldTypeCompatibility('date', ['March 5']).status).toBe('compatible');
  });

  it('reports out-of-range values for byte as a certain failure', () => {
    expect(getFieldTypeCompatibility('byte', [300, 1])).toEqual({
      status: 'certain_failure',
      issue: 'out_of_range',
      failingDocuments: 1,
      totalDocuments: 2,
    });
  });

  it('reports out-of-range numeric strings for short as a certain failure', () => {
    expect(getFieldTypeCompatibility('short', ['40000']).status).toBe('certain_failure');
  });

  it('checks exact long and unsigned_long string boundaries', () => {
    expect(getFieldTypeCompatibility('long', ['9223372036854775807']).status).toBe('compatible');
    expect(getFieldTypeCompatibility('long', ['9223372036854775808']).status).toBe(
      'certain_failure'
    );
    expect(getFieldTypeCompatibility('unsigned_long', ['18446744073709551615']).status).toBe(
      'compatible'
    );
    expect(getFieldTypeCompatibility('unsigned_long', ['18446744073709551616']).status).toBe(
      'certain_failure'
    );
  });

  it('reports out-of-range values for float types as a certain failure', () => {
    expect(getFieldTypeCompatibility('half_float', [70000]).issue).toBe('out_of_range');
    expect(getFieldTypeCompatibility('double', [1.5]).status).toBe('compatible');
  });

  it('reports objects going into keyword as a certain failure', () => {
    expect(getFieldTypeCompatibility('keyword', [{ a: 1 }, 'b'])).toEqual({
      status: 'certain_failure',
      issue: 'object_value',
      failingDocuments: 1,
      totalDocuments: 2,
    });
  });

  it('reports differing constant_keyword values as a certain failure', () => {
    expect(getFieldTypeCompatibility('constant_keyword', ['a', 'a', 'b'])).toEqual({
      status: 'certain_failure',
      issue: 'multiple_constant_values',
      failingDocuments: 1,
      totalDocuments: 3,
    });
  });

  it('accepts a single constant_keyword value', () => {
    expect(getFieldTypeCompatibility('constant_keyword', ['a', 'a']).status).toBe('compatible');
  });

  it('reports negative unsigned_long values as a certain failure', () => {
    expect(getFieldTypeCompatibility('unsigned_long', [-1]).issue).toBe('negative_value');
  });

  it('checks every element of array values', () => {
    expect(getFieldTypeCompatibility('byte', [[1, 300]])).toEqual({
      status: 'certain_failure',
      issue: 'out_of_range',
      failingDocuments: 1,
      totalDocuments: 1,
    });
  });

  it('ignores documents without a value', () => {
    expect(getFieldTypeCompatibility('boolean', [undefined, null, 'true', []])).toEqual({
      status: 'compatible',
      failingDocuments: 0,
      totalDocuments: 1,
    });
  });
});

describe('getFieldValue', () => {
  it('reads nested and dotted keys', () => {
    expect(getFieldValue({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
    expect(getFieldValue({ 'a.b': { c: 2 } }, 'a.b.c')).toBe(2);
    expect(getFieldValue({ a: 1 }, 'a.b')).toBeUndefined();
  });
});
