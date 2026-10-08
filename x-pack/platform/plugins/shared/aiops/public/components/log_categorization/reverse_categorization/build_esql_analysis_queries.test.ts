/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEsqlCategorizeQuery,
  buildEsqlCategoryDocsQuery,
  categoryKeyFromPattern,
  findCategoryMatchingFieldValue,
  getAlignedSparklineRange,
  getEsqlDocumentScopeQuery,
  mapEsqlSparklineToBuckets,
} from './build_esql_analysis_queries';

describe('build_esql_analysis_queries', () => {
  describe('getEsqlDocumentScopeQuery', () => {
    it('strips LIMIT and SORT so analysis is not truncated to the Discover page', () => {
      expect(
        getEsqlDocumentScopeQuery(
          'FROM logs-* | WHERE service.name == "checkout" | SORT @timestamp DESC | LIMIT 500'
        )
      ).toBe('FROM logs-* | WHERE service.name == "checkout"');
    });

    it('strips STATS so document filters before an aggregate are preserved', () => {
      expect(
        getEsqlDocumentScopeQuery(
          'FROM logs-* | WHERE status == 500 | STATS count = COUNT(*) BY host'
        )
      ).toBe('FROM logs-* | WHERE status == 500');
    });

    it('converts TS source commands to FROM', () => {
      expect(getEsqlDocumentScopeQuery('TS metrics-* | WHERE cpu > 0.9 | LIMIT 10')).toContain(
        'FROM metrics-*'
      );
    });
  });

  describe('getAlignedSparklineRange', () => {
    const interval = 30 * 60 * 1000;

    it('rounds the start down to the interval and covers the whole range', () => {
      const earliest = Date.parse('2024-01-01T10:12:34.000Z');
      const latest = Date.parse('2024-01-01T12:05:00.000Z');

      expect(getAlignedSparklineRange({ earliest, latest, intervalMs: interval })).toEqual({
        start: Date.parse('2024-01-01T10:00:00.000Z'),
        end: Date.parse('2024-01-01T12:30:00.000Z'),
        bucketCount: 5,
      });
    });

    it('leaves an already aligned range unchanged', () => {
      const earliest = Date.parse('2024-01-01T10:00:00.000Z');
      const latest = Date.parse('2024-01-01T11:00:00.000Z');

      expect(getAlignedSparklineRange({ earliest, latest, intervalMs: interval })).toEqual({
        start: earliest,
        end: latest,
        bucketCount: 2,
      });
    });
  });

  describe('buildEsqlCategorizeQuery', () => {
    it('appends CATEGORIZE and SPARKLINE onto the Discover document scope', () => {
      const query = buildEsqlCategorizeQuery({
        esql: 'FROM logs-* | WHERE service.name == "checkout" | LIMIT 100',
        fieldName: 'message',
        timeFieldName: '@timestamp',
        bucketCount: 40,
        rangeStart: Date.parse('2024-01-01T00:00:00.000Z'),
        rangeEnd: Date.parse('2024-01-01T20:00:00.000Z'),
      });

      expect(query).toContain('FROM logs-*');
      expect(query).toContain('WHERE service.name == "checkout"');
      expect(query).not.toContain('LIMIT 100');
      expect(query).toContain('BY Pattern = CATEGORIZE(`message`)');
      expect(query).toContain(
        'SPARKLINE(COUNT(*), `@timestamp`, 40, TO_DATETIME("2024-01-01T00:00:00.000Z"), TO_DATETIME("2024-01-01T20:00:00.000Z"))'
      );
      expect(query).toContain('SORT Count DESC');
    });
  });

  describe('buildEsqlCategoryDocsQuery', () => {
    it('ANDs MATCH onto an existing WHERE clause', () => {
      const query = buildEsqlCategoryDocsQuery({
        esql: 'FROM logs-* | WHERE service.name == "checkout" | LIMIT 100',
        fieldName: 'message',
        timeFieldName: '@timestamp',
        categoryKey: 'error timeout',
        size: 50,
      });

      expect(query).toContain('WHERE service.name == "checkout"');
      expect(query).toContain('AND MATCH(`message`, "error timeout"');
      expect(query).toContain('KEEP `message`, `@timestamp`');
      expect(query).toContain('LIMIT 50');
    });

    it('appends a WHERE MATCH clause when the scope has no WHERE', () => {
      const query = buildEsqlCategoryDocsQuery({
        esql: 'FROM logs-*',
        fieldName: 'message',
        timeFieldName: '@timestamp',
        categoryKey: 'error',
      });

      expect(query).toContain('| WHERE MATCH(`message`, "error"');
    });
  });

  describe('categoryKeyFromPattern', () => {
    it('extracts MATCH tokens from a categorize regex', () => {
      expect(categoryKeyFromPattern('.*?error.+?timeout.*?')).toBe('error timeout');
    });
  });

  describe('mapEsqlSparklineToBuckets', () => {
    it('maps sparkline values onto fixed-interval bucket keys', () => {
      expect(
        mapEsqlSparklineToBuckets({
          values: [1, 2, 3],
          earliest: 1000,
          intervalMs: 100,
        })
      ).toEqual({
        1000: 1,
        1100: 2,
        1200: 3,
      });
    });
  });

  describe('findCategoryMatchingFieldValue', () => {
    it('returns the category whose regex matches the field value', () => {
      const categories = [
        {
          key: 'ok',
          count: 1,
          examples: [],
          regex: '.*?ok.*?',
        },
        {
          key: 'error timeout',
          count: 2,
          examples: [],
          regex: '.*?error.+?timeout.*?',
        },
      ];

      expect(
        findCategoryMatchingFieldValue(categories, 'request failed with error timeout code')?.key
      ).toBe('error timeout');
    });
  });
});
