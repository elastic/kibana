/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateJSON } from './validate_json';

describe('validateJSON', () => {
  it('does not return an error for valid JSON and no maxProperties', () => {
    expect(validateJSON({ value: JSON.stringify({ foo: 'test' }) })).toBeUndefined();
  });

  it('does not return an error for valid JSON and attributes less than maxProperties', () => {
    expect(
      validateJSON({ value: JSON.stringify({ foo: 'test' }), maxProperties: 1 })
    ).toBeUndefined();
  });

  it('does not return an error with empty value and maxProperties=0', () => {
    expect(validateJSON({ maxProperties: 0 })).toBeUndefined();
  });

  it('does not return an error with no values', () => {
    expect(validateJSON({})).toBeUndefined();
  });

  it('does not return an error with empty object and maxProperties=0', () => {
    expect(validateJSON({ value: JSON.stringify({}), maxProperties: 0 })).toBeUndefined();
  });

  it('validates syntax errors correctly', () => {
    expect(validateJSON({ value: 'foo' })).toBe('Invalid JSON.');
  });

  it('validates max properties correctly', () => {
    const value = { foo: 'test', bar: 'test 2' };

    expect(validateJSON({ value: JSON.stringify(value), maxProperties: 1 })).toBe(
      'A maximum of 1 additional fields can be defined at a time.'
    );
  });

  it('does not return an error for an object', () => {
    expect(validateJSON({ value: { foo: 'test' } })).toBeUndefined();
  });

  it('does not return an error when the value contains a mustache template', () => {
    expect(
      validateJSON({ value: '{ "u_raw_json": {{#context}}{{.}}{{/context}} }' })
    ).toBeUndefined();
  });

  it('does not return an error when the value contains a mustache template inside a JSON string', () => {
    expect(
      validateJSON({ value: '{ "correlation": "{{rule.id}}:{{alert.id}}" }' })
    ).toBeUndefined();
  });

  it('does not validate max properties when the value contains a mustache template', () => {
    // Values with mustache templates are validated on the server after rendering
    expect(
      validateJSON({ value: '{ "foo": "{{rule.id}}", "bar": "test" }', maxProperties: 1 })
    ).toBeUndefined();
  });
});
