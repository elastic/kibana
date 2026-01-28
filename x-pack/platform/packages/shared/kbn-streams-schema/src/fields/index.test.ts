/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldDefinitionConfigSchema, FIELD_DEFINITION_TYPES } from '.';

describe('fieldDefinitionConfigSchema', () => {
  it('should accept geo_point type', () => {
    const geoPointField = {
      type: 'geo_point',
    };
    expect(fieldDefinitionConfigSchema.parse(geoPointField)).toEqual(geoPointField);
  });

  it('should fail for invalid type', () => {
    const invalidField = {
      type: 'invalid_type',
    };
    expect(() => fieldDefinitionConfigSchema.parse(invalidField)).toThrow();
  });

  it.each([
    'integer',
    'short',
    'byte',
    'float',
    'half_float',
    'text',
    'wildcard',
    'version',
    'unsigned_long',
    'date_nanos',
  ] as const)('should accept %s type', (type) => {
    const field = { type };
    expect(fieldDefinitionConfigSchema.parse(field)).toEqual(field);
  });

  it('should have all expected field types in FIELD_DEFINITION_TYPES', () => {
    const expectedTypes = [
      'keyword',
      'match_only_text',
      'long',
      'double',
      'date',
      'boolean',
      'ip',
      'geo_point',
      'integer',
      'short',
      'byte',
      'float',
      'half_float',
      'text',
      'wildcard',
      'version',
      'unsigned_long',
      'date_nanos',
    ];
    expect(FIELD_DEFINITION_TYPES).toEqual(expectedTypes);
  });
});
