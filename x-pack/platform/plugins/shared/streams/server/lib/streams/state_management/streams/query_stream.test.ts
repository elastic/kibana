/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlViewName } from '@kbn/streams-schema';
import { getSourcesFromEsqlQuery } from './query_stream';

describe('getSourcesFromEsqlQuery', () => {
  describe('ES|QL query parsing for parent view validation', () => {
    it('should extract sources from a simple FROM clause', () => {
      const sources = getSourcesFromEsqlQuery('FROM logs | WHERE status = "error"');
      expect(sources).toEqual(['logs']);
    });

    it('should extract sources from a FROM clause with view prefix', () => {
      const parentViewName = getEsqlViewName('logs.apache');
      const sources = getSourcesFromEsqlQuery(`FROM ${parentViewName} | WHERE status = "error"`);
      expect(sources).toContain(parentViewName);
    });

    it('should return empty array for queries without FROM clause', () => {
      const sources = getSourcesFromEsqlQuery('SHOW INFO');
      expect(sources).toEqual([]);
    });

    it('should handle multiple sources in FROM clause', () => {
      const sources = getSourcesFromEsqlQuery('FROM logs, metrics | LIMIT 10');
      expect(sources).toContain('logs');
      expect(sources).toContain('metrics');
    });

    it('should handle complex ES|QL queries with pipes', () => {
      const parentViewName = getEsqlViewName('logs.apache');
      const query = `FROM ${parentViewName} | WHERE level = "error" | STATS count(*) BY host | SORT count DESC`;
      const sources = getSourcesFromEsqlQuery(query);
      expect(sources).toContain(parentViewName);
    });

    it('should return empty array for malformed ES|QL', () => {
      const sources = getSourcesFromEsqlQuery('THIS IS NOT VALID ESQL {{{{');
      expect(sources).toEqual([]);
    });
  });
});
