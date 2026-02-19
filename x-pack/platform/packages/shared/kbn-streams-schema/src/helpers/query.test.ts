/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { buildEsqlQuery } from './query';

describe('buildEsqlQuery', () => {
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
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("message: \\"error\\" or message: \\"failed\\"") AND `some.field` == "some value"'
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
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("level: \\"INFO\\"") AND @timestamp >= "2025-01-01T00:00:00.000Z" AND @timestamp <= "2025-12-31T23:59:59.999Z"'
      );
    });
  });

  describe('includeMetadata parameter', () => {
    it('should build query without metadata when includeMetadata is false', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('status: "success"');
      const esqlQuery = buildEsqlQuery(indices, query, false);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("status: \\"success\\"") AND `some.field` == "some value"'
      );
    });

    it('should build query with metadata when includeMetadata is true', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('host.name: "server-01"');
      const esqlQuery = buildEsqlQuery(indices, query, true);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("host.name: \\"server-01\\"") AND `some.field` == "some value"'
      );
    });
  });

  it('should build query without feature filter', () => {
    const indices = ['logs.child', 'logs.child.*'];
    const input = {
      kql: {
        query: 'event.type: "access"',
      },
    };
    const esqlQuery = buildEsqlQuery(indices, input);

    expect(esqlQuery).toBe('FROM logs.child,logs.child.* | WHERE KQL("event.type: \\"access\\"")');
  });

  it('should build query with simple feature filter', () => {
    const indices = ['logs.child', 'logs.child.*'];
    const query = createTestInput('event.type: "access"', {
      field: 'some.field',
      eq: 'some value',
    });
    const esqlQuery = buildEsqlQuery(indices, query);

    expect(esqlQuery).toBe(
      'FROM logs.child,logs.child.* | WHERE KQL("event.type: \\"access\\"") AND `some.field` == "some value"'
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
    const esqlQuery = buildEsqlQuery(indices, query);

    expect(esqlQuery).toBe(
      'FROM logs.child,logs.child.* | WHERE KQL("event.type: \\"access\\"") AND (`some.field` == "some value" OR `some.other.field` == "some other value")'
    );
  });

  describe('KQL query variations', () => {
    it('should handle simple field queries', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('message: "hello world"');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("message: \\"hello world\\"") AND `some.field` == "some value"'
      );
    });

    it('should handle complex KQL queries with boolean operators', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('(level: "ERROR" or level: "WARN") and service.name: "api"');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("(level: \\"ERROR\\" or level: \\"WARN\\") and service.name: \\"api\\"") AND `some.field` == "some value"'
      );
    });

    it('should handle KQL queries with wildcards', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('message: *error* and host.name: web-*');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("message: *error* and host.name: web-*") AND `some.field` == "some value"'
      );
    });

    it('should handle KQL queries with special characters', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestInput('url.path: "/api/v1/users" and response.status: 404');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("url.path: \\"/api/v1/users\\" and response.status: 404") AND `some.field` == "some value"'
      );
    });
  });

  describe('KQL query escaping (security)', () => {
    it('should properly escape double quotes in KQL queries', () => {
      const indices = ['logs.child'];
      const query = createTestInput('message: "test "quoted" sentence"');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child | WHERE KQL("message: \\"test \\"quoted\\" sentence\\"") AND `some.field` == "some value"'
      );
    });

    it('should properly escape backslashes in KQL queries', () => {
      const indices = ['logs.child'];
      const query = createTestInput('file.path: "C:\\Program Files\\App"');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child | WHERE KQL("file.path: \\"C:\\\\Program Files\\\\App\\"") AND `some.field` == "some value"'
      );
    });
  });
});
