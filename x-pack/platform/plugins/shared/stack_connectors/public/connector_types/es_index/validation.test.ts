/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexNameValidator } from './validation';
import type { ValidationFuncArg } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

describe('indexNameValidator', () => {
  const validate = (value: string | any) =>
    indexNameValidator()({ value } as ValidationFuncArg<any, any>);

  test('returns undefined for valid index name', () => {
    expect(validate('test-index')).toBeUndefined();
  });

  test('fails if index name is not lowercase', () => {
    const result = validate('TestIndex');
    expect(result).toMatchObject({
      code: 'ERR_LOWERCASE_STRING',
      formatType: 'INDEX_PATTERN',
      message: 'The index pattern must be lowercase.',
    });
  });

  test('fails if index name contains wildcard (*)', () => {
    const result = validate('test-index*');
    expect(result).toMatchObject({
      code: 'ERR_INVALID_CHARS',
      formatType: 'INDEX_PATTERN',
      message: 'The index pattern cannot contain wildcards (*).',
    });
  });

  test('fails if index name contains #', () => {
    const result = validate('test-index#');
    expect(result).toMatchObject({
      code: 'ERR_INVALID_CHARS',
      formatType: 'INDEX_PATTERN',
      message: 'The index pattern contains the invalid character #.',
    });
  });

  test('fails if index name contains :', () => {
    const result = validate('test-index:');
    expect(result).toMatchObject({
      code: 'ERR_INVALID_CHARS',
      formatType: 'INDEX_PATTERN',
      message: 'The index pattern contains the invalid character :.',
    });
  });

  test('fails if index name contains ,', () => {
    const result = validate('test-index,');
    expect(result).toMatchObject({
      code: 'ERR_INVALID_CHARS',
      formatType: 'INDEX_PATTERN',
      message: 'The index pattern contains the invalid character ,.',
    });
  });

  test.each(['-index', '_index', '+index'])(
    'fails if index starts with invalid prefix: %s',
    (value) => {
      const result = validate(value);
      expect(result).toMatchObject({
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_PATTERN',
        message: `The index pattern cannot start with ${value[0]}.`,
      });
    }
  );
  test.each(['.', '..'])('fails if index is: %s', (value) => {
    const result = validate(value);
    expect(result).toMatchObject({
      code: 'ERR_FIELD_FORMAT',
      formatType: 'INDEX_PATTERN',
      message: `The index pattern cannot be ${value}`,
    });
  });

  test('fails if index name exceeds 255 bytes', () => {
    const value = 'a'.repeat(256);
    const result = validate(value);
    expect(result).toMatchObject({
      code: 'ERR_MAX_LENGTH',
      formatType: 'INDEX_PATTERN',
      message: 'The index pattern cannot be longer than 255.',
    });
  });

  test('returns undefined for non-string values', () => {
    expect(validate(undefined)).toBeUndefined();
    expect(validate(123)).toBeUndefined();
    expect(validate({})).toBeUndefined();
    expect(validate([])).toBeUndefined();
    expect(validate(null)).toBeUndefined();
  });
});
