/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeSchema, formatSchemaForLlm } from './schema_utils';

describe('describeSchema', () => {
  it('extracts field names, types, required/optional, and descriptions', () => {
    const fields = describeSchema({
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        count: { type: 'number', description: 'Max results' },
      },
      required: ['query'],
    });

    expect(fields).toEqual([
      { name: 'query', type: 'string', required: true, description: 'The search query' },
      { name: 'count', type: 'number', required: false, description: 'Max results' },
    ]);
  });

  it('returns an empty array for non-object schemas and objects without properties', () => {
    expect(describeSchema({ type: 'string' })).toEqual([]);
    expect(describeSchema({ type: 'object' })).toEqual([]);
  });

  it('handles schemas with no descriptions', () => {
    const fields = describeSchema({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });

    expect(fields).toEqual([{ name: 'name', type: 'string', required: true }]);
  });

  it('treats a required field with a default as optional', () => {
    const fields = describeSchema({
      type: 'object',
      properties: { limit: { type: 'number', default: 10, description: 'Page size' } },
      required: ['limit'],
    });

    expect(fields[0].required).toBe(false);
  });

  it('falls back to "unknown" when a field has no type', () => {
    const fields = describeSchema({
      type: 'object',
      properties: { anything: {} },
    });

    expect(fields[0].type).toBe('unknown');
  });

  it('resolves a root $ref before reading properties', () => {
    const fields = describeSchema({
      $ref: '#/$defs/Input',
      $defs: {
        Input: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    });

    expect(fields).toEqual([{ name: 'id', type: 'string', required: true }]);
  });
});

describe('formatSchemaForLlm', () => {
  it('formats fields into a multi-line string', () => {
    const result = formatSchemaForLlm({
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['query'],
    });

    expect(result).toBe(
      '- query (string, required): Search query\n- limit (number, optional): Max results'
    );
  });

  it('returns "No parameters" for empty object schemas', () => {
    expect(formatSchemaForLlm({ type: 'object', properties: {} })).toBe('No parameters');
  });
});
