/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceSchema } from './space_schema';

// non-serverless space schema
const spaceBaseSchema = getSpaceSchema(false);
const spaceServerlessSchema = getSpaceSchema(true);

const defaultProperties = {
  id: 'foo',
  name: 'foo',
};

describe('#id', () => {
  test('is required', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        id: undefined,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[id]: expected value of type [string] but got [undefined]"`
    );
  });

  test('allows lowercase a-z, 0-9, "_" and "-"', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        id: 'abcdefghijklmnopqrstuvwxyz0123456789_-',
      })
    ).not.toThrowError();
  });

  test(`doesn't allow uppercase`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        id: 'Foo',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[id]: must be lower case, a-z, 0-9, '_', and '-' are allowed"`
    );
  });

  test(`doesn't allow an empty string`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        id: '',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[id]: must be lower case, a-z, 0-9, '_', and '-' are allowed"`
    );
  });

  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', ',', '.', '/', '?'].forEach(
    (invalidCharacter) => {
      test(`doesn't allow ${invalidCharacter}`, () => {
        expect(() =>
          spaceBaseSchema.validate({
            ...defaultProperties,
            id: `foo-${invalidCharacter}`,
          })
        ).toThrowError();
      });
    }
  );
});

describe('#disabledFeatures', () => {
  test('is optional', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        disabledFeatures: undefined,
      })
    ).not.toThrowError();
  });

  test('defaults to an empty array', () => {
    const result = spaceBaseSchema.validate({
      ...defaultProperties,
      disabledFeatures: undefined,
    });
    expect(result.disabledFeatures).toEqual([]);
  });

  test('must be an array if provided', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        disabledFeatures: 'foo',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[disabledFeatures]: could not parse array value from json input"`
    );
  });

  test('allows an array of strings', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        disabledFeatures: ['foo', 'bar'],
      })
    ).not.toThrowError();
  });

  test('does not allow an array containing non-string elements', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        disabledFeatures: ['foo', true],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[disabledFeatures.1]: expected value of type [string] but got [boolean]"`
    );
  });
});

describe('#color', () => {
  test('is optional', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: undefined,
      })
    ).not.toThrowError();
  });

  test(`doesn't allow an empty string`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: '',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[color]: must be a 6 digit hex color, starting with a #"`
    );
  });

  test(`allows lower case hex color code`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: '#aabbcc',
      })
    ).not.toThrowError();
  });

  test(`allows upper case hex color code`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: '#AABBCC',
      })
    ).not.toThrowError();
  });

  test(`allows numeric hex color code`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: '#123456',
      })
    ).not.toThrowError();
  });

  test(`must start with a hash`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: '123456',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[color]: must be a 6 digit hex color, starting with a #"`
    );
  });

  test(`cannot exceed 6 digits following the hash`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: '1234567',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[color]: must be a 6 digit hex color, starting with a #"`
    );
  });

  test(`cannot be fewer than 6 digits following the hash`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        color: '12345',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[color]: must be a 6 digit hex color, starting with a #"`
    );
  });
});

describe('#imageUrl', () => {
  test('is optional', () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        imageUrl: undefined,
      })
    ).not.toThrowError();
  });

  test(`must start with data:image`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        imageUrl: 'notValid',
      })
    ).toThrowErrorMatchingInlineSnapshot(`"[imageUrl]: must start with 'data:image'"`);
  });

  test(`checking that a valid image is accepted as imageUrl`, () => {
    expect(() =>
      spaceBaseSchema.validate({
        ...defaultProperties,
        imageUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTnU1rJkAAAB3klEQVRYR+2WzUrDQBCARzwqehE8ir1WPfgqRRA1bePBXgpe/MGCB9/Aiw+j+ASCB6kotklaEwW1F0WwNSaps9lV69awGzBpDzt8pJP9mXxsmk3ABH2oUEIilJAIJSRCCYlQQiKUkIh4QgY5agZodVjBowFrBktWQzDBU2ykiYaDuQpCYgnl3QunGzM6Z6YF+b5SkcgK1UH/aLbYReQiYL9d9/o+XFop5IU0Vl4uapAzoXC3eEBPw9vH1/wT6Vs2otPSkoH/IZzlzO/TU2vgQm8nl69Hp0H7nZ4OXogLJSSKBIUC3w88n+Ueyfv56fVZnqCQNVnCHbLrkV0Gd2d+GNkglsk438dhaTxloZDutV4wb06Vf40JcWZ2sMttPpE8NaHGeBnzIAhwPXqHseVB11EyLD0hxLUeaYud2a3B0g3k7GyFtrhX7F2RqhC+yV3jgTb2Rqdqf7/kUxYiWBOlTtXxfPJEtc8b5thGb+8AhL4ohnCNqQjZ2T2+K5rnw2M6KwEhKNDSGM3pTdxjhDgLbHkw/v/zw4AiPuSsfMzAiTidKxiF/ArpFqyzK8SMOlkwvloUMYRCtNvZLWeuIomd2Za/WZS4QomjhEQoIRFKSIQSEqGERAyfEH4YDBFQ/ARU6BiBxCAIQQAAAABJRU5ErkJggg==',
      })
    ).not.toThrowError();
  });
});

describe('#solution', () => {
  it('should throw error if solution is defined in serverless offering', () => {
    expect(() =>
      spaceServerlessSchema.validate({ ...defaultProperties, solution: 'es' })
    ).toThrow();
  });

  it('should not throw error if solution is undefined in classic offering', () => {
    expect(() =>
      spaceBaseSchema.validate({ ...defaultProperties, solution: undefined }, {})
    ).not.toThrow();
  });

  it('should throw error if solution is invalid in classic offering', () => {
    expect(() => spaceBaseSchema.validate({ ...defaultProperties, solution: 'some_value' }, {}))
      .toThrowErrorMatchingInlineSnapshot(`
      "[solution]: types that failed validation:
      - [solution.0]: expected value to equal [security]
      - [solution.1]: expected value to equal [oblt]
      - [solution.2]: expected value to equal [es]
      - [solution.3]: expected value to equal [classic]"
    `);

    expect(() =>
      spaceBaseSchema.validate({ ...defaultProperties, solution: ' es ' }, {})
    ).toThrow();
  });
});
