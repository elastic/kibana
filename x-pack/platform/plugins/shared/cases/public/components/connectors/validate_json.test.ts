/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFuncArg } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/types';
import { generateJSONValidator } from './validate_json';

describe('validateJSON', () => {
  const formData = {} as ValidationFuncArg<FormData, unknown>;

  it('does not return an error for valid JSON with less than maxProperties', () => {
    expect(
      generateJSONValidator()({ ...formData, value: JSON.stringify({ foo: 'test' }) })
    ).toBeUndefined();
  });

  it('does not return an error with an empty string value', () => {
    expect(generateJSONValidator()({ ...formData, value: '' })).toBeUndefined();
  });

  it('does not return an error with undefined value', () => {
    expect(generateJSONValidator()({ ...formData, value: undefined })).toBeUndefined();
  });

  it('does not return an error with a null value', () => {
    expect(generateJSONValidator()({ ...formData, value: null })).toBeUndefined();
  });

  it('does not return an error when maxAdditionalFields is set', () => {
    const maxAdditionalFields = 20;
    let body = '';
    for (let i = 0; i < maxAdditionalFields; i += 1) {
      body = `${body}${body.length ? ', ' : ''}"${i}": "foobar"`;
    }
    const value = `{${body}}`;

    expect(generateJSONValidator({ maxAdditionalFields })({ ...formData, value })).toBeUndefined();
  });

  it('validates syntax errors correctly', () => {
    expect(generateJSONValidator()({ ...formData, value: 'foo' })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'Invalid JSON.',
    });
  });

  it('validates a string with spaces correctly', () => {
    expect(generateJSONValidator()({ ...formData, value: '   ' })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'Invalid JSON.',
    });
  });

  it('validates max properties correctly (default)', () => {
    let value = '{"a":"1"';
    for (let i = 0; i < 10; i += 1) {
      value = `${value}, "${i}": "foobar"`;
    }
    value += '}';

    expect(generateJSONValidator()({ ...formData, value })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'A maximum of 10 additional fields can be defined at a time.',
    });
  });

  it('validates max properties correctly (with options)', () => {
    let value = '{"a":"1"';
    for (let i = 0; i < 10; i += 1) {
      value = `${value}, "${i}": "foobar"`;
    }
    value += '}';

    expect(generateJSONValidator({ maxAdditionalFields: 1 })({ ...formData, value })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'A maximum of 1 additional fields can be defined at a time.',
    });
  });

  it('throws when a non object string is found', () => {
    expect(generateJSONValidator()({ ...formData, value: '"foobar"' })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'Invalid JSON.',
    });
  });

  it('throws when a non object empty string is found', () => {
    expect(generateJSONValidator()({ ...formData, value: '""' })).toEqual({
      code: 'ERR_JSON_FORMAT',
      message: 'Invalid JSON.',
    });
  });
});
