/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseCustomFieldSchema } from './v1';

describe('CaseCustomFieldSchema', () => {
  it.each([
    [
      'type text value text',
      {
        key: 'string_custom_field_1',
        type: 'text',
        value: 'this is a text field value',
      },
    ],
    [
      'type text value null',
      {
        key: 'string_custom_field_2',
        type: 'text',
        value: null,
      },
    ],
    [
      'type toggle value boolean',
      {
        key: 'toggle_custom_field_1',
        type: 'toggle',
        value: true,
      },
    ],
    [
      'type toggle value null',
      {
        key: 'toggle_custom_field_2',
        type: 'toggle',
        value: null,
      },
    ],
    [
      'type number value number',
      {
        key: 'number_custom_field_1',
        type: 'number',
        value: 1,
      },
    ],
    [
      'type number value null',
      {
        key: 'number_custom_field_2',
        type: 'number',
        value: null,
      },
    ],
  ])('has expected attributes for customField with %s', (_, customField) => {
    const result = CaseCustomFieldSchema.safeParse(customField);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(customField);
  });

  it('fails if text type and value do not match', () => {
    const result = CaseCustomFieldSchema.safeParse({
      key: 'text_custom_field_1',
      type: 'text',
      value: 1,
    });
    expect(result.success).toBe(false);
  });

  it('fails if toggle type and value do not match', () => {
    const result = CaseCustomFieldSchema.safeParse({
      key: 'list_custom_field_1',
      type: 'toggle',
      value: 'hello',
    });
    expect(result.success).toBe(false);
  });

  it('fails if number type but value is a string', () => {
    const result = CaseCustomFieldSchema.safeParse({
      key: 'list_custom_field_1',
      type: 'number',
      value: 'hi',
    });
    expect(result.success).toBe(false);
  });
});
