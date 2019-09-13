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

/* avatar image tests */
describe('#imageUrl', () => {
  test('is optional', () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      imageUrl: undefined,
    });
    expect(result.error).toBeNull();
  });

  test(`must start with data:image`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      imageUrl: 'notValid',
    });
    expect(result.error).toMatchInlineSnapshot(
      `[ValidationError: child "imageUrl" fails because ["imageUrl" with value "notValid" fails to match the Image URL should start with 'data:image' pattern]]`
    );
  });

  test(`checking that a valid image is accepted as imageUrl`, () => {
    const result = spaceSchema.validate({
      ...defaultProperties,
      imageUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTnU1rJkAAAB3klEQVRYR+2WzUrDQBCARzwqehE8ir1WPfgqRRA1bePBXgpe/MGCB9/Aiw+j+ASCB6kotklaEwW1F0WwNSaps9lV69awGzBpDzt8pJP9mXxsmk3ABH2oUEIilJAIJSRCCYlQQiKUkIh4QgY5agZodVjBowFrBktWQzDBU2ykiYaDuQpCYgnl3QunGzM6Z6YF+b5SkcgK1UH/aLbYReQiYL9d9/o+XFop5IU0Vl4uapAzoXC3eEBPw9vH1/wT6Vs2otPSkoH/IZzlzO/TU2vgQm8nl69Hp0H7nZ4OXogLJSSKBIUC3w88n+Ueyfv56fVZnqCQNVnCHbLrkV0Gd2d+GNkglsk438dhaTxloZDutV4wb06Vf40JcWZ2sMttPpE8NaHGeBnzIAhwPXqHseVB11EyLD0hxLUeaYud2a3B0g3k7GyFtrhX7F2RqhC+yV3jgTb2Rqdqf7/kUxYiWBOlTtXxfPJEtc8b5thGb+8AhL4ohnCNqQjZ2T2+K5rnw2M6KwEhKNDSGM3pTdxjhDgLbHkw/v/zw4AiPuSsfMzAiTidKxiF/ArpFqyzK8SMOlkwvloUMYRCtNvZLWeuIomd2Za/WZS4QomjhEQoIRFKSIQSEqGERAyfEH4YDBFQ/ARU6BiBxCAIQQAAAABJRU5ErkJggg==',
    });
    expect(result.error).toBeNull();
  });
});
