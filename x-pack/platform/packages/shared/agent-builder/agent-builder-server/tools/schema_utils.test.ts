/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { describeZodSchema, formatSchemaForLlm } from './schema_utils';

describe('describeZodSchema', () => {
  it('extracts field names, types, required/optional, and descriptions', () => {
    const schema = z.object({
      query: z.string().describe('The search query'),
      count: z.number().optional().describe('Max results'),
    });

    const fields = describeZodSchema(schema);

    expect(fields).toEqual([
      { name: 'query', type: 'string', required: true, description: 'The search query' },
      { name: 'count', type: 'number', required: false, description: 'Max results' },
    ]);
  });

  it('returns empty array for non-object schemas', () => {
    const schema = z.string();
    const fields = describeZodSchema(schema);
    expect(fields).toEqual([]);
  });

  it('handles schemas with no descriptions', () => {
    const schema = z.object({
      name: z.string(),
    });

    const fields = describeZodSchema(schema);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('name');
    expect(fields[0].required).toBe(true);
  });

  it('unwraps fields with defaults to the underlying type', () => {
    const schema = z.object({
      limit: z.number().default(10).describe('Page size'),
    });

    const fields = describeZodSchema(schema);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('number');
    expect(fields[0].required).toBe(false);
  });

  it('handles nullable fields', () => {
    const schema = z.object({
      tag: z.string().nullable().describe('Optional tag'),
    });

    const fields = describeZodSchema(schema);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('tag');
  });
});

describe('formatSchemaForLlm', () => {
  it('formats fields into a multi-line string', () => {
    const schema = z.object({
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Max results'),
    });

    const result = formatSchemaForLlm(schema);

    expect(result).toContain('- query (string, required): Search query');
    expect(result).toContain('- limit (number, optional): Max results');
    expect(result).toContain('\n');
  });

  it('returns "No parameters" for empty object schemas', () => {
    const schema = z.object({});
    const result = formatSchemaForLlm(schema);
    expect(result).toBe('No parameters');
  });
});
