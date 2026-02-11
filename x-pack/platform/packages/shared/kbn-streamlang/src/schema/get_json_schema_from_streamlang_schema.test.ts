/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamlangDSLSchema } from '../../types/streamlang';
import { getJsonSchemaFromStreamlangSchema } from './get_json_schema_from_streamlang_schema';

describe('getJsonSchemaFromStreamlangSchema', () => {
  it('generates a valid JSON Schema from the streamlang DSL schema', () => {
    const schema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema);
    expect(schema).toMatchSnapshot();
  });

  it('has the expected top-level structure', () => {
    const schema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema) as Record<string, any>;

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['steps']);
    expect(schema.properties.steps).toBeDefined();
    expect(schema.properties.steps.type).toBe('array');
  });

  it('filters manual_ingest_pipeline for wired streams', () => {
    const defaultSchema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema) as Record<
      string,
      any
    >;
    const wiredSchema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema, 'wired') as Record<
      string,
      any
    >;

    const defaultString = JSON.stringify(defaultSchema);
    const wiredString = JSON.stringify(wiredSchema);

    // Default schema should include manual_ingest_pipeline
    expect(defaultString).toContain('manual_ingest_pipeline');
    // Wired schema should have it filtered out
    expect(wiredString).not.toContain('manual_ingest_pipeline');
  });
});
