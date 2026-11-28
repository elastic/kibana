/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTemplateNameSchema,
  createTemplateSchema,
  templateSchema,
} from './validate_schemas';

const minimalTemplate = {
  name: 'my-template',
  indexPatterns: ['logs-*'],
  _kbnMeta: { type: 'default' },
};

describe('templateSchema', () => {
  it('SHOULD accept a pre-existing slash-named template on update', () => {
    const value = templateSchema.validate({
      ...minimalTemplate,
      name: 'a/b',
    });
    expect(value).toBeTruthy();
  });
});

describe('createTemplateSchema', () => {
  it('SHOULD reject a name containing a forward slash on create', () => {
    expect(() =>
      createTemplateSchema.validate({
        ...minimalTemplate,
        name: 'a/b',
      })
    ).toThrowError(/must not contain the character "\/"/);
  });
});

describe('createTemplateNameSchema', () => {
  it('SHOULD reject a name containing a forward slash', () => {
    expect(() => createTemplateNameSchema.validate('a/b')).toThrowError(
      /must not contain the character "\/"/
    );
  });
});
