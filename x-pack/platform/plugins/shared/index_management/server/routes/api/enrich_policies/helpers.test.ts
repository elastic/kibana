/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommonFields, normalizeFieldsList } from './helpers';

const commonField = { name: 'name', type: 'keyword', normalizedType: 'keyword' };
const fieldsPerIndexMock = [
  {
    index: 'index1',
    fields: [commonField, { name: 'age', type: 'long', normalizedType: 'number' }],
  },
  {
    index: 'index2',
    fields: [commonField, { name: 'email', type: 'keyword', normalizedType: 'keyword' }],
  },
];

describe('getCommonFields', () => {
  it('should return common fields', () => {
    expect(getCommonFields(fieldsPerIndexMock)).toEqual([commonField]);
  });

  it('should return empty array if it has no common fields', () => {
    const mock = [
      {
        index: 'index1',
        fields: [{ name: 'age', type: 'long', normalizedType: 'number' }],
      },
    ];

    expect(getCommonFields(mock)).toEqual([]);
  });
});

describe('normalizeFieldsList', () => {
  it('knows how to normalize types', () => {
    const mock = {
      age: {
        long: {
          type: 'long',
          metadata_field: false,
          searchable: false,
          aggregatable: false,
        },
      },
      ignore: {
        _ignore: {
          type: '_ignore',
          metadata_field: false,
          searchable: false,
          aggregatable: false,
        },
      },
    };

    expect(normalizeFieldsList(mock)).toEqual([
      {
        name: 'age',
        type: 'long',
        normalizedType: 'number',
      },
    ]);
  });
});
