/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFieldNames } from './utils';

describe('toFieldNames', () => {
  it('maps fields to field names with label falling back to name', () => {
    const fields = [
      {
        name: 'field_one',
        label: 'Field One',
        type: 'keyword' as const,
        control: 'INPUT_TEXT' as const,
      },
      { name: 'field_two', type: 'keyword' as const, control: 'TEXTAREA' as const },
    ];

    expect(toFieldNames(fields)).toEqual([
      { name: 'field_one', label: 'Field One', type: 'keyword', control: 'INPUT_TEXT' },
      { name: 'field_two', label: 'field_two', type: 'keyword', control: 'TEXTAREA' },
    ]);
  });

  it('returns an empty array when given no fields', () => {
    expect(toFieldNames([])).toEqual([]);
  });
});
