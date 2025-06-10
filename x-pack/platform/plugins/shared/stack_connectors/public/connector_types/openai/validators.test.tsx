/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateURL } from './validators';
import { ValidationFuncArg } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

describe('validateUrl', () => {
  const message = 'test error message';
  const code = 'ERR_FIELD_FORMAT';
  const formatType = 'URL';
  const errorMessage = { code, formatType, message };
  const validator = (value: any) => validateURL(message)({ value } as ValidationFuncArg<any, any>);

  test('should return undefined for a valid URL', () => {
    expect(validator('https://example.com')).toBeUndefined();
    expect(validator('https://serverwithoutdot/v1/chat/completions')).toBeUndefined();
    expect(validator('https://myllm:8443/v1/chat/completions')).toBeUndefined();
  });

  test('should return error if the value is not a string', () => {
    expect(validator(123)).toMatchObject(errorMessage);
    expect(validator({})).toMatchObject(errorMessage);
    expect(validator(null)).toMatchObject(errorMessage);
  });

  test('should return error if the value is an empty string', () => {
    expect(validator('')).toMatchObject(errorMessage);
  });

  test('should return error if the value ends with dots', () => {
    expect(validator('http://example.com.')).toMatchObject({ code, formatType, message });
  });

  test('should return error if the value contains spaces', () => {
    expect(validator('http://exam ple.com')).toMatchObject(errorMessage);
  });

  test('should return error if the value does not have the correct format', () => {
    expect(validator('invalid-url')).toMatchObject(errorMessage);
  });
});
