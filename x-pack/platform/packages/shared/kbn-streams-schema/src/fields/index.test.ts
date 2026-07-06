/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '.';
import {
  classicFieldDefinitionConfigSchema,
  fieldDefinitionConfigSchema,
  isMappingProperties,
  namedFieldDefinitionConfigSchema,
} from '.';

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

  it('should accept description-only override without type', () => {
    const descriptionOnlyOverride = {
      description: 'Custom description without freezing inherited mapping',
    };
    expect(fieldDefinitionConfigSchema.parse(descriptionOnlyOverride)).toEqual(
      descriptionOnlyOverride
    );
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

describe('namedFieldDefinitionConfigSchema', () => {
  it('should accept named field with type', () => {
    const namedField = {
      name: 'body.text',
      type: 'keyword',
    };
    expect(namedFieldDefinitionConfigSchema.parse(namedField)).toEqual(namedField);
  });

  it('should accept named field with description-only (no type)', () => {
    const namedFieldDescOnly = {
      name: 'body.text',
      description: 'docs-only override',
    };
    expect(namedFieldDefinitionConfigSchema.parse(namedFieldDescOnly)).toEqual(namedFieldDescOnly);
  });

  it('should accept named field with type and description', () => {
    const namedFieldWithDesc = {
      name: 'body.text',
      type: 'keyword',
      description: 'A keyword field',
    };
    expect(namedFieldDefinitionConfigSchema.parse(namedFieldWithDesc)).toEqual(namedFieldWithDesc);
  });

  it('should fail for named field without name', () => {
    const fieldWithoutName = {
      type: 'keyword',
    };
    expect(() => namedFieldDefinitionConfigSchema.parse(fieldWithoutName)).toThrow();
  });

  it('should fail for named field with empty name', () => {
    const fieldWithEmptyName = {
      name: '',
      type: 'keyword',
    };
    expect(() => namedFieldDefinitionConfigSchema.parse(fieldWithEmptyName)).toThrow();
  });
});

describe('classicFieldDefinitionConfigSchema', () => {
  it('should accept regular field types with optional description', () => {
    const keywordField = { type: 'keyword' };
    expect(classicFieldDefinitionConfigSchema.parse(keywordField)).toEqual(keywordField);

    const keywordFieldWithDesc = {
      type: 'keyword',
      description: 'A keyword field',
    };
    expect(classicFieldDefinitionConfigSchema.parse(keywordFieldWithDesc)).toEqual(
      keywordFieldWithDesc
    );
  });

  it('should accept system type', () => {
    const systemField = { type: 'system' };
    expect(classicFieldDefinitionConfigSchema.parse(systemField)).toEqual(systemField);

    const systemFieldWithDesc = { type: 'system', description: 'A system field' };
    expect(classicFieldDefinitionConfigSchema.parse(systemFieldWithDesc)).toEqual(
      systemFieldWithDesc
    );
  });

  it('should reject description-only override without type', () => {
    const descriptionOnlyOverride = {
      description: 'Custom description without type',
    };
    expect(() => classicFieldDefinitionConfigSchema.parse(descriptionOnlyOverride)).toThrow();
  });

  it.each([
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
  ] as const)('should accept %s type', (type) => {
    const field = { type };
    expect(classicFieldDefinitionConfigSchema.parse(field)).toEqual(field);
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

  it('should return false for description-only overrides (no type)', () => {
    const fields: FieldDefinition = {
      field1: { type: 'keyword' },
      field2: { description: 'doc-only' },
    };
    expect(isMappingProperties(fields)).toBe(false);
  });

  it('should return false when containing system type', () => {
    const fields: FieldDefinition = {
      field1: { type: 'keyword' },
      field2: { type: 'system' },
    };
    expect(isMappingProperties(fields)).toBe(false);
  });

  it('should return false when containing doc-only fields (description without type)', () => {
    const fields: FieldDefinition = {
      field1: { type: 'keyword' },
      field2: { description: 'doc-only field' },
    };
    expect(isMappingProperties(fields)).toBe(false);
  });
});
