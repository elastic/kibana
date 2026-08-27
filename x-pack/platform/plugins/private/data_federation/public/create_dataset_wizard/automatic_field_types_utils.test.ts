/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  automaticFieldTypesToMappings,
  countModifiedAutomaticFieldTypesForFlow3,
  getDynamicInferredFields,
  mappingsToAutomaticFieldTypes,
  mergeMissingAutomaticFieldTypes,
  seedAutomaticFieldTypesFromInferred,
} from './automatic_field_types_utils';

describe('automatic_field_types_utils', () => {
  const inferredFields = [
    { name: '@timestamp', type: 'date' },
    { name: 'message', type: 'text' },
  ];

  it('seeds automatic field types from inferred fields', () => {
    expect(seedAutomaticFieldTypesFromInferred(inferredFields)).toEqual({
      '@timestamp': 'date',
      message: 'text',
    });
  });

  it('converts automatic field types to index template mappings', () => {
    expect(
      automaticFieldTypesToMappings({
        '@timestamp': 'date',
        message: 'text',
      })
    ).toEqual({
      properties: {
        '@timestamp': { type: 'date' },
        message: { type: 'text' },
      },
    });
  });

  it('converts mappings back to automatic field types', () => {
    expect(
      mappingsToAutomaticFieldTypes({
        properties: {
          test: { type: 'rank_features' },
        },
      })
    ).toEqual({
      test: 'rank_features',
    });
  });

  it('merges only the inferred fields missing from the current field types', () => {
    expect(
      mergeMissingAutomaticFieldTypes(
        { message: 'keyword' },
        { '@timestamp': 'date', message: 'text' }
      )
    ).toEqual({
      message: 'keyword',
      '@timestamp': 'date',
    });

    expect(mergeMissingAutomaticFieldTypes({}, {})).toEqual({});
  });

  it('excludes mapped fields from the Dynamic inferred list', () => {
    expect(getDynamicInferredFields(inferredFields, {})).toEqual(inferredFields);
    expect(getDynamicInferredFields(inferredFields, { message: 'keyword' })).toEqual([
      { name: '@timestamp', type: 'date' },
    ]);
    expect(
      getDynamicInferredFields(inferredFields, { '@timestamp': 'date', message: 'text' })
    ).toEqual([]);
  });

  it('counts schema edits against the inferred baseline in flow 3', () => {
    const seeded = seedAutomaticFieldTypesFromInferred(inferredFields);

    expect(countModifiedAutomaticFieldTypesForFlow3(inferredFields, seeded)).toBe(0);
    expect(
      countModifiedAutomaticFieldTypesForFlow3(inferredFields, {
        ...seeded,
        message: 'keyword',
      })
    ).toBe(1);
    expect(
      countModifiedAutomaticFieldTypesForFlow3(inferredFields, {
        ...seeded,
        test: 'rank_features',
      })
    ).toBe(1);
    expect(
      countModifiedAutomaticFieldTypesForFlow3(inferredFields, {
        message: 'text',
        test: 'rank_features',
      })
    ).toBe(2);
  });
});
