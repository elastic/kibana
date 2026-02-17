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

describe('add_queries field validation (integration via getKqlFieldNamesFromExpression)', () => {
  // These tests use the real getKqlFieldNamesFromExpression to verify
  // end-to-end behavior of field extraction + unmapped field detection.
  let getKqlFieldNamesFromExpression: (expression: string) => string[];

  beforeAll(async () => {
    const esQuery = await import('@kbn/es-query');
    getKqlFieldNamesFromExpression = esQuery.getKqlFieldNamesFromExpression;
  });

  const mappedFields = new Set([
    'message',
    'host.name',
    'service.name',
    'log.level',
    'server.address',
    'server.port',
    '@timestamp',
  ]);

  it('rejects a query referencing an unmapped field', () => {
    const fieldNames = getKqlFieldNamesFromExpression('non_existent_field: "error"');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['non_existent_field']);
  });

  it('accepts a query referencing only mapped fields', () => {
    const fieldNames = getKqlFieldNamesFromExpression('message: "error" and log.level: "error"');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('passes free-text queries through (no field extracted)', () => {
    const fieldNames = getKqlFieldNamesFromExpression('"error"');
    expect(fieldNames).toEqual([]);
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('validates wildcard field patterns from KQL', () => {
    const fieldNames = getKqlFieldNamesFromExpression('server.*: "localhost"');
    expect(fieldNames).toEqual(['server.*']);
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('rejects wildcard field patterns that match nothing', () => {
    const fieldNames = getKqlFieldNamesFromExpression('nonexistent.*: "value"');
    expect(fieldNames).toEqual(['nonexistent.*']);
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['nonexistent.*']);
  });

  it('handles mixed valid and invalid fields in compound queries', () => {
    const fieldNames = getKqlFieldNamesFromExpression(
      'message: "error" and fake_field: "value" or host.name: "prod"'
    );
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['fake_field']);
  });

  it('validates fields in NOT expressions', () => {
    const fieldNames = getKqlFieldNamesFromExpression('not bogus_field: "test"');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['bogus_field']);
  });

  it('validates fields in range expressions', () => {
    const fieldNames = getKqlFieldNamesFromExpression('@timestamp >= "2024-01-01"');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual([]);
  });

  it('rejects unmapped fields in range expressions', () => {
    const fieldNames = getKqlFieldNamesFromExpression('fake_timestamp >= "2024-01-01"');
    const unmapped = getUnmappedFields(fieldNames, mappedFields);
    expect(unmapped).toEqual(['fake_timestamp']);
  });
});
