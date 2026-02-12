/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '.';
import { fieldDefinitionConfigSchema, isMappingProperties } from '.';

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

  it('should accept unmapped type', () => {
    const unmappedField = {
      type: 'unmapped',
    };
    expect(fieldDefinitionConfigSchema.parse(unmappedField)).toEqual(unmappedField);
  });

  it('should accept unmapped type with description', () => {
    const unmappedFieldWithDesc = {
      type: 'unmapped',
      description: 'This field is for documentation purposes only',
    };
    expect(fieldDefinitionConfigSchema.parse(unmappedFieldWithDesc)).toEqual(unmappedFieldWithDesc);
  });

  it('should accept description on regular field types', () => {
    const keywordFieldWithDesc = {
      type: 'keyword',
      description: 'A keyword field with a description',
    };
    expect(fieldDefinitionConfigSchema.parse(keywordFieldWithDesc)).toEqual(keywordFieldWithDesc);
  });

  it('should accept system type with description', () => {
    const systemFieldWithDesc = {
      type: 'system',
      description: 'A system field',
    };
    expect(fieldDefinitionConfigSchema.parse(systemFieldWithDesc)).toEqual(systemFieldWithDesc);
  });

  it('should accept format with description', () => {
    const dateFieldWithFormatAndDesc = {
      type: 'date',
      format: 'strict_date_optional_time',
      description: 'Timestamp when the event occurred',
    };
    expect(fieldDefinitionConfigSchema.parse(dateFieldWithFormatAndDesc)).toEqual(
      dateFieldWithFormatAndDesc
    );
  });
});

describe('isMappingProperties', () => {
  it('should return true for fields with only mapping types', () => {
    const fields: FieldDefinition = {
      field1: { type: 'keyword' },
      field2: { type: 'date' },
    };
    expect(isMappingProperties(fields)).toBe(true);
  });

  it('should return false when containing system type', () => {
    const fields: FieldDefinition = {
      field1: { type: 'keyword' },
      field2: { type: 'system' },
    };
    expect(isMappingProperties(fields)).toBe(false);
  });

  it('should return false when containing unmapped type', () => {
    const fields: FieldDefinition = {
      field1: { type: 'keyword' },
      field2: { type: 'unmapped' },
    };
    expect(isMappingProperties(fields)).toBe(false);
  });

  it('should return false when containing both system and unmapped types', () => {
    const fields: FieldDefinition = {
      field1: { type: 'keyword' },
      field2: { type: 'system' },
      field3: { type: 'unmapped' },
    };
    expect(isMappingProperties(fields)).toBe(false);
  });
});
