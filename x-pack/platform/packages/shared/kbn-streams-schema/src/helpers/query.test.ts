/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './query';
import type { StreamQuery } from '../queries';

describe('buildEsqlQuery', () => {
  const createTestQuery = (kqlQuery: string): StreamQuery => ({
    id: 'irrelevant',
    title: 'irrelevant',
    kql: {
      query: kqlQuery,
    },
  });

  describe('basic functionality', () => {
    it('should build a valid ESQL query with multiple indices', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestQuery('message: "error" or message: "failed"');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("message: \\"error\\" or message: \\"failed\\"")'
      );
    });
  });

  describe('includeMetadata parameter', () => {
    it('should build query without metadata when includeMetadata is false', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestQuery('status: "success"');
      const esqlQuery = buildEsqlQuery(indices, query, false);

      expect(esqlQuery).toBe('FROM logs.child,logs.child.* | WHERE KQL("status: \\"success\\"")');
    });

    it('should build query with metadata when includeMetadata is true', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestQuery('host.name: "server-01"');
      const esqlQuery = buildEsqlQuery(indices, query, true);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("host.name: \\"server-01\\"")'
      );
    });
  });

  describe('KQL query variations', () => {
    it('should handle simple field queries', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestQuery('message: "hello world"');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("message: \\"hello world\\"")'
      );
    });

    it('should handle complex KQL queries with boolean operators', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestQuery('(level: "ERROR" or level: "WARN") and service.name: "api"');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("(level: \\"ERROR\\" or level: \\"WARN\\") and service.name: \\"api\\"")'
      );
    });

    it('should handle KQL queries with wildcards', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestQuery('message: *error* and host.name: web-*');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("message: *error* and host.name: web-*")'
      );
    });

    it('should handle KQL queries with special characters', () => {
      const indices = ['logs.child', 'logs.child.*'];
      const query = createTestQuery('url.path: "/api/v1/users" and response.status: 404');
      const esqlQuery = buildEsqlQuery(indices, query);

      expect(esqlQuery).toBe(
        'FROM logs.child,logs.child.* | WHERE KQL("url.path: \\"/api/v1/users\\" and response.status: 404")'
      );
    });
  });
});
