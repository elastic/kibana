/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spaceSchema } from './space_schema';

const defaultProperties = {
  id: 'foo',
  name: 'foo',
};

describe('#id', () => {
  test('is optional', () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: undefined,
    });
    expect(result.error).toBeNull();
  });

  test('allows lowercase a-z, 0-9, "_" and "-"', () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: 'abcdefghijklmnopqrstuvwxyz0123456789_-',
    });
    expect(result.error).toBeNull();
  });

  test(`doesn't allow uppercase`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: 'Foo',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "id" fails because ["id" with value "Foo" fails to match the lower case, a-z, 0-9, "_", and "-" are allowed pattern]]`
    );
  });

  test(`doesn't allow an empty string`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      id: '',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "id" fails because ["id" is not allowed to be empty]]`
    );
  });

  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', ',', '.', '/', '?'].forEach(
    invalidCharacter => {
      test(`doesn't allow ${invalidCharacter}`, () => {
        const result = spaceSchema.validate({
          ...defaultProperties,
          id: `foo-${invalidCharacter}`,
        });
        expect(result.error).toMatchObject({
          message: `child "id" fails because ["id" with value "foo-${invalidCharacter}" fails to match the lower case, a-z, 0-9, "_", and "-" are allowed pattern]`,
        });
      });
    }
  );
});

describe('#color', () => {
  test('is optional', () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: undefined,
    });
    expect(result.error).toBeNull();
  });

  test(`doesn't allow an empty string`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: '',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "color" fails because ["color" is not allowed to be empty]]`
    );
  });

  test(`allows lower case hex color code`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: '#aabbcc',
    });
    expect(result.error).toBeNull();
  });

  test(`allows upper case hex color code`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: '#AABBCC',
    });
    expect(result.error).toBeNull();
  });

  test(`allows numeric hex color code`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: '#123456',
    });
    expect(result.error).toBeNull();
  });

  test(`must start with a hash`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: '123456',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "color" fails because ["color" with value "123456" fails to match the 6 digit hex color, starting with a # pattern]]`
    );
  });

  test(`cannot exceed 6 digits following the hash`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: '1234567',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "color" fails because ["color" with value "1234567" fails to match the 6 digit hex color, starting with a # pattern]]`
    );
  });

  test(`cannot be fewer than 6 digits following the hash`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      color: '12345',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "color" fails because ["color" with value "12345" fails to match the 6 digit hex color, starting with a # pattern]]`
    );
  });
});
