/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { buildEsqlQueryFromKql } from './query';

describe('buildEsqlQueryFromKql', () => {
  const createTestInput = (
    kqlQuery: string,
    featureFilter: Condition = { field: 'some.field', eq: 'some value' }
  ) => ({
    feature: {
      name: 'irrelevant',
      filter: featureFilter,
      type: 'system' as const,
    },
    kql: {
      query: kqlQuery,
    },
  });

  describe('basic functionality', () => {
    it('should build a valid ESQL query with multiple indices', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('message: "error" or message: "failed"');
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("message: \\"error\\" or message: \\"failed\\"") AND COALESCE(`some.field` == "some value", FALSE)'
      );
    });

    it('should build ESQL query with range filter for date ranges', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const rangeFilter: Condition = {
        field: '@timestamp',
        range: {
          gte: '2025-01-01T00:00:00.000Z',
          lte: '2025-12-31T23:59:59.999Z',
        },
      };
      const query = createTestInput('level: "INFO"', rangeFilter);
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("level: \\"INFO\\"") AND COALESCE(@timestamp >= "2025-01-01T00:00:00.000Z" AND @timestamp <= "2025-12-31T23:59:59.999Z", FALSE)'
      );
    });
  });

  it('should always include METADATA _id, _source', () => {
    const indices = ['logs.child', 'logs.child.*'];
    const query = createTestInput('status: "success"');
    const esqlQuery = buildEsqlQueryFromKql(indices, query);

    expect(esqlQuery).toBe(
      'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("status: \\"success\\"") AND COALESCE(`some.field` == "some value", FALSE)'
    );
    expect(esqlQuery).toContain('METADATA _id, _source');
  });

  it('should build query without feature filter', () => {
    const indices = ['logs.child', 'logs.child.*'];
    const input = {
      kql: {
        query: 'event.type: "access"',
      },
    };
    const esqlQuery = buildEsqlQueryFromKql(indices, input);

    expect(esqlQuery).toBe(
      'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("event.type: \\"access\\"")'
    );
  });

  it('should build query with simple feature filter', () => {
    const indices = ['logs.child', 'logs.child.*'];
    const query = createTestInput('event.type: "access"', {
      field: 'some.field',
      eq: 'some value',
    });
    const esqlQuery = buildEsqlQueryFromKql(indices, query);

    expect(esqlQuery).toBe(
      'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("event.type: \\"access\\"") AND COALESCE(`some.field` == "some value", FALSE)'
    );
  });

  it('should build query with `or` feature filter', () => {
    const indices = ['logs.child', 'logs.child.*'];
    const query = createTestInput('event.type: "access"', {
      or: [
        { field: 'some.field', eq: 'some value' },
        { field: 'some.other.field', eq: 'some other value' },
      ],
    });
    const esqlQuery = buildEsqlQueryFromKql(indices, query);

    expect(esqlQuery).toBe(
      'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("event.type: \\"access\\"") AND (COALESCE(`some.field` == "some value", FALSE) OR COALESCE(`some.other.field` == "some other value", FALSE))'
    );
  });

  describe('KQL query variations', () => {
    it('should handle simple field queries', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('message: "hello world"');
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("message: \\"hello world\\"") AND COALESCE(`some.field` == "some value", FALSE)'
      );
    });

    it('should handle complex KQL queries with boolean operators', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('(level: "ERROR" or level: "WARN") and service.name: "api"');
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("(level: \\"ERROR\\" or level: \\"WARN\\") and service.name: \\"api\\"") AND COALESCE(`some.field` == "some value", FALSE)'
      );
    });

    it('should handle KQL queries with wildcards', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('message: *error* and host.name: web-*');
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("message: *error* and host.name: web-*") AND COALESCE(`some.field` == "some value", FALSE)'
      );
    });

    it('should handle KQL queries with special characters', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('url.path: "/api/v1/users" and response.status: 404');
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("url.path: \\"/api/v1/users\\" and response.status: 404") AND COALESCE(`some.field` == "some value", FALSE)'
      );
    });
  });

  describe('KQL query escaping (security)', () => {
    it('should properly escape double quotes in KQL queries', () => {
      const indices = ['logs.child'];
      const query = createTestInput('message: "test "quoted" sentence"');
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child METADATA _id, _source | WHERE KQL("message: \\"test \\"quoted\\" sentence\\"") AND COALESCE(`some.field` == "some value", FALSE)'
      );
    });

    it('should properly escape backslashes in KQL queries', () => {
      const indices = ['logs.child'];
      const query = createTestInput('file.path: "C:\\Program Files\\App"');
      const esqlQuery = buildEsqlQueryFromKql(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child METADATA _id, _source | WHERE KQL("file.path: \\"C:\\\\Program Files\\\\App\\"") AND COALESCE(`some.field` == "some value", FALSE)'
      );
    });
  });
});
