/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldNameAttribute } from './validate_attributes';

describe('getFieldNameAttribute', () => {
  test('should return the field name when no attributes are ignored', () => {
    expect(getFieldNameAttribute('name', [])).toEqual('name');
  });

  test('should return the first part of a nested field name when no attributes are ignored', () => {
    expect(getFieldNameAttribute('attributes.name', [])).toEqual('attributes');
    expect(getFieldNameAttribute('attributes.name.value', [])).toEqual('attributes');
  });

  test('should filter out ignored attributes and return the first remaining part', () => {
    expect(getFieldNameAttribute('attributes.name', ['attributes'])).toEqual('name');
    expect(getFieldNameAttribute('attributes.name.value', ['attributes'])).toEqual('name');
  });

  test('should filter out multiple ignored attributes', () => {
    expect(getFieldNameAttribute('attributes.name.value', ['attributes', 'name'])).toEqual('value');
    expect(getFieldNameAttribute('attributes.name.value', ['attributes', 'value'])).toEqual('name');
  });

  test('should return empty string when all parts are ignored', () => {
    expect(getFieldNameAttribute('attributes', ['attributes'])).toEqual('');
    expect(getFieldNameAttribute('attributes.name', ['attributes', 'name'])).toEqual('');
  });

  test('should return empty string when field name is empty', () => {
    expect(getFieldNameAttribute('', [])).toEqual('');
    expect(getFieldNameAttribute('', ['attributes'])).toEqual('');
  });

  test('should return the first non-ignored part even when later parts are ignored', () => {
    expect(getFieldNameAttribute('field1.field2.field3', ['field2', 'field3'])).toEqual('field1');
    expect(getFieldNameAttribute('field1.field2.field3', ['field1', 'field3'])).toEqual('field2');
  });

  test('should handle field names with no dots and ignored attributes', () => {
    expect(getFieldNameAttribute('name', ['name'])).toEqual('');
    expect(getFieldNameAttribute('name', ['other'])).toEqual('name');
  });
});
