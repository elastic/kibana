/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnmappedFields } from './generate_significant_events';

describe('getUnmappedFields', () => {
  const mappedFields = new Set([
    'message',
    'host.name',
    'service.name',
    'service.version',
    'log.level',
    'server.address',
    'server.port',
    '@timestamp',
  ]);

  it('returns empty array when all fields are mapped', () => {
    const result = getUnmappedFields(['message', 'host.name'], mappedFields);
    expect(result).toEqual([]);
  });

  it('returns unmapped fields', () => {
    const result = getUnmappedFields(['message', 'non_existent_field'], mappedFields);
    expect(result).toEqual(['non_existent_field']);
  });

  it('returns all fields when none are mapped', () => {
    const result = getUnmappedFields(['foo', 'bar.baz'], mappedFields);
    expect(result).toEqual(['foo', 'bar.baz']);
  });

  it('returns empty array for empty field names (free-text queries)', () => {
    const result = getUnmappedFields([], mappedFields);
    expect(result).toEqual([]);
  });

  it('validates wildcard patterns against mapped fields', () => {
    // server.* should match server.address and server.port
    const result = getUnmappedFields(['server.*'], mappedFields);
    expect(result).toEqual([]);
  });

  it('rejects wildcard patterns that match no mapped fields', () => {
    const result = getUnmappedFields(['nonexistent.*'], mappedFields);
    expect(result).toEqual(['nonexistent.*']);
  });

  it('handles mixed valid and invalid fields', () => {
    const result = getUnmappedFields(
      ['message', 'non_existent_field', 'server.*', 'missing.*'],
      mappedFields
    );
    expect(result).toEqual(['non_existent_field', 'missing.*']);
  });

  it('handles wildcard in the middle of a pattern', () => {
    // service.* should match service.name and service.version
    const result = getUnmappedFields(['service.*'], mappedFields);
    expect(result).toEqual([]);
  });

  it('handles empty mapped fields set', () => {
    const emptyMapped = new Set<string>();
    const result = getUnmappedFields(['message'], emptyMapped);
    expect(result).toEqual(['message']);
  });

  it('handles wildcard with empty mapped fields set', () => {
    const emptyMapped = new Set<string>();
    const result = getUnmappedFields(['server.*'], emptyMapped);
    expect(result).toEqual(['server.*']);
  });
});

describe('add_queries ES|QL field validation (integration via Parser + Walker)', () => {
  let Parser: typeof import('@kbn/esql-language').Parser;
  let Walker: typeof import('@kbn/esql-language').Walker;

  beforeAll(async () => {
    const esqlLanguage = await import('@kbn/esql-language');
    Parser = esqlLanguage.Parser;
    Walker = esqlLanguage.Walker;
  });

  const mappedFields = new Set([
    'message',
    'host.name',
    'service.name',
    'log.level',
    'server.address',
    'server.port',
    'body.text',
    '@timestamp',
  ]);

  const extractFieldNames = (esql: string): string[] => {
    const { root } = Parser.parse(esql);
    const fieldNames: string[] = [];
    Walker.walk(root, {
      visitColumn: (node) => {
        fieldNames.push(node.parts.join('.'));
      },
    });
    return [...new Set(fieldNames)];
  };

  it('detects syntax errors in invalid ES|QL', () => {
    const { errors } = Parser.parse('NOT VALID ESQL QUERY');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('parses a valid ES|QL query without errors', () => {
    const { errors } = Parser.parse('FROM logs,logs.* | WHERE message:"error"');
    expect(errors).toEqual([]);
  });

  it('rejects a query referencing an unmapped field', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE non_existent_field:"error"'
    );
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['non_existent_field']);
  });

  it('accepts a query referencing only mapped fields', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE message:"error" AND log.level:"ERROR"'
    );
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('extracts fields from MATCH_PHRASE function calls', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE MATCH_PHRASE(body.text, "Failed password for")'
    );
    expect(fieldNames).toContain('body.text');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('extracts fields from comparison operators', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE service.name == "api-service"'
    );
    expect(fieldNames).toContain('service.name');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('handles compound queries with mixed valid and invalid fields', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE message:"error" AND fake_field:"value" OR host.name == "prod"'
    );
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['fake_field']);
  });

  it('handles NOT expressions', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE NOT bogus_field:"test"'
    );
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['bogus_field']);
  });

  it('validates fields in IS NOT NULL expressions', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE message IS NOT NULL'
    );
    expect(fieldNames).toContain('message');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('validates fields in LIKE expressions', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE host.name LIKE "prod-*"'
    );
    expect(fieldNames).toContain('host.name');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('does not include FROM source names as field references', () => {
    const fieldNames = extractFieldNames(
      'FROM logs,logs.* | WHERE message:"error"'
    );
    expect(fieldNames).not.toContain('logs');
    expect(fieldNames).toContain('message');
  });
});
