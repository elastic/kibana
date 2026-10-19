/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamlangDSLSchema } from '../../types/streamlang';
import { processorTypes } from '../../types/processors';
import { getJsonSchemaFromStreamlangSchema } from './get_json_schema_from_streamlang_schema';

function getActionUnionSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const stepsItems = (
    (schema.properties as Record<string, unknown> | undefined)?.steps as
      | Record<string, unknown>
      | undefined
  )?.items as Record<string, unknown> | undefined;
  const stepOptions = stepsItems?.anyOf as unknown[] | undefined;
  if (!Array.isArray(stepOptions)) {
    throw new Error('Expected steps.items.anyOf');
  }
  const actionUnionSchema = stepOptions.find((option: unknown) => {
    const opt = option as Record<string, unknown>;
    const props = opt?.properties as Record<string, unknown> | undefined;
    return opt && typeof opt === 'object' && Array.isArray(opt.anyOf) && !props?.condition;
  }) as Record<string, unknown> | undefined;
  if (!actionUnionSchema) {
    throw new Error('Expected action union schema in steps.items.anyOf');
  }
  return actionUnionSchema;
}

describe('getJsonSchemaFromStreamlangSchema', () => {
  it('generates a valid JSON Schema from the streamlang DSL schema', () => {
    const schema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema);
    expect(schema).toMatchSnapshot();
  });

  it('has the expected top-level structure', () => {
    const schema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema) as Record<
      string,
      unknown
    >;
    const stepsSchema = (schema.properties as Record<string, unknown>)?.steps as
      | Record<string, unknown>
      | undefined;

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['steps']);
    expect(stepsSchema).toBeDefined();
    expect(stepsSchema?.type).toBe('array');
  });

  it('includes every processor action in the union-level action enum', () => {
    const schema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema) as Record<
      string,
      unknown
    >;
    const actionUnionSchema = getActionUnionSchema(schema);
    const actionProperty = (actionUnionSchema.properties as Record<string, unknown> | undefined)
      ?.action as { enum?: string[] } | undefined;
    const actionEnum = actionProperty?.enum ?? [];

    expect(new Set(actionEnum)).toEqual(new Set(processorTypes));
  });

  it('filters manual_ingest_pipeline for wired streams', () => {
    const defaultSchema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema) as Record<
      string,
      unknown
    >;
    const wiredSchema = getJsonSchemaFromStreamlangSchema(streamlangDSLSchema, 'wired') as Record<
      string,
      unknown
    >;

    const defaultString = JSON.stringify(defaultSchema);
    const wiredString = JSON.stringify(wiredSchema);

    // Default schema should include manual_ingest_pipeline
    expect(defaultString).toContain('manual_ingest_pipeline');
    // Wired schema should have it filtered out
    expect(wiredString).not.toContain('manual_ingest_pipeline');
  });
});
