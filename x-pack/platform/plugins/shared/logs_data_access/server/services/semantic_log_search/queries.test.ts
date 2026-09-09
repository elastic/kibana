/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildTimeRangeFilter,
  buildSemanticSearchQuery,
  buildSemanticSearchQueryNoCollapse,
  buildTemplateStatsQuery,
  buildExpandQueryExact,
  buildExpandQueryApproximate,
  buildCategorizeTextQuery,
} from './queries';

describe('semantic log search queries', () => {
  const timeRange = { start: 1704067200000, end: 1704153600000 }; // 2024-01-01 to 2024-01-02

  describe('buildTimeRangeFilter', () => {
    it('builds a range filter with epoch_millis format', () => {
      const filter = buildTimeRangeFilter(timeRange);

      expect(filter).toEqual({
        range: {
          '@timestamp': {
            gte: 1704067200000,
            lt: 1704153600000,
            format: 'epoch_millis',
          },
        },
      });
    });
  });

  describe('buildSemanticSearchQuery', () => {
    it('builds a semantic query with collapse', () => {
      const query = buildSemanticSearchQuery({
        target: 'logs-*',
        semanticField: 'message_semantic',
        templateIdField: 'message.template_id',
        nlQuery: 'connection failures',
        timeRange,
        size: 10,
      });

      expect(query.index).toBe('logs-*');
      expect(query.size).toBe(10);
      expect(query.collapse).toEqual({ field: 'message.template_id' });
      expect(query.query?.bool?.must).toEqual([
        {
          semantic: {
            field: 'message_semantic',
            query: 'connection failures',
          },
        },
      ]);
      expect(query.query?.bool?.filter).toHaveLength(1);
    });

    it('sorts by score descending', () => {
      const query = buildSemanticSearchQuery({
        target: 'logs-*',
        semanticField: 'message_semantic',
        templateIdField: 'message.template_id',
        nlQuery: 'test',
        timeRange,
        size: 10,
      });

      expect(query.sort).toEqual([{ _score: { order: 'desc' } }]);
    });
  });

  describe('buildSemanticSearchQueryNoCollapse', () => {
    it('builds a semantic query without collapse', () => {
      const query = buildSemanticSearchQueryNoCollapse({
        target: 'logs-*',
        semanticField: 'message_semantic',
        nlQuery: 'connection failures',
        timeRange,
        size: 10,
      });

      expect(query.collapse).toBeUndefined();
      expect(query.query?.bool?.must).toEqual([
        {
          semantic: {
            field: 'message_semantic',
            query: 'connection failures',
          },
        },
      ]);
    });
  });

  describe('buildTemplateStatsQuery', () => {
    it('builds a terms aggregation with include filter', () => {
      const templates = ['template1', 'template2', 'template3'];
      const query = buildTemplateStatsQuery({
        target: 'logs-*',
        templateField: 'message.template',
        templateValues: templates,
        timeRange,
      });

      expect(query.size).toBe(0);
      expect(query.aggs?.templates).toEqual({
        terms: {
          field: 'message.template',
          include: templates,
          size: 3,
        },
        aggs: {
          first_seen: { min: { field: '@timestamp' } },
          last_seen: { max: { field: '@timestamp' } },
        },
      });
    });

    it('does not include semantic query (counts total prevalence)', () => {
      const query = buildTemplateStatsQuery({
        target: 'logs-*',
        templateField: 'message.template',
        templateValues: ['t1'],
        timeRange,
      });

      // Only time range filter, no semantic query
      expect(query.query?.bool?.filter).toHaveLength(1);
      expect(query.query?.bool?.must).toBeUndefined();
    });
  });

  describe('buildExpandQueryExact', () => {
    it('builds an exact term query on template field', () => {
      const query = buildExpandQueryExact({
        target: 'logs-*',
        templateField: 'message.template',
        templateValue: 'Connection refused to * after * retries',
        timeRange,
        pageSize: 50,
      });

      expect(query.query?.bool?.filter).toContainEqual({
        term: { 'message.template': 'Connection refused to * after * retries' },
      });
      expect(query.size).toBe(50);
    });

    it('includes search_after when provided', () => {
      const searchAfter = [1704100000000, 'doc123'];
      const query = buildExpandQueryExact({
        target: 'logs-*',
        templateField: 'message.template',
        templateValue: 'test',
        timeRange,
        pageSize: 50,
        searchAfter,
      });

      expect(query.search_after).toEqual(searchAfter);
    });

    it('sorts by timestamp desc with doc tiebreaker', () => {
      const query = buildExpandQueryExact({
        target: 'logs-*',
        templateField: 'message.template',
        templateValue: 'test',
        timeRange,
        pageSize: 50,
      });

      expect(query.sort).toEqual([
        { '@timestamp': { order: 'desc' } },
        { _doc: { order: 'asc' } },
      ]);
    });
  });

  describe('buildExpandQueryApproximate', () => {
    it('builds a match query with operator AND for approximate pattern matching', () => {
      const query = buildExpandQueryApproximate({
        target: 'logs-*',
        field: 'message',
        pattern: 'Connection refused to server',
        timeRange,
        pageSize: 50,
      });

      // Should produce a match query with operator: 'and'
      const must = query.query?.bool?.must as Array<{ match?: Record<string, unknown> }>;
      expect(must).toBeDefined();
      expect(must[0]?.match).toBeDefined();
      expect(must[0]?.match?.message).toEqual({
        query: 'Connection refused to server',
        operator: 'and',
        fuzziness: 0,
        auto_generate_synonyms_phrase_query: false,
      });
    });

    it('includes search_after when provided', () => {
      const searchAfter = [1704100000000, 'doc123'];
      const query = buildExpandQueryApproximate({
        target: 'logs-*',
        field: 'message',
        pattern: 'test pattern',
        timeRange,
        pageSize: 50,
        searchAfter,
      });

      expect(query.search_after).toEqual(searchAfter);
    });
  });

  describe('buildCategorizeTextQuery', () => {
    it('builds a categorize_text aggregation', () => {
      const query = buildCategorizeTextQuery({
        target: 'logs-*',
        field: 'message',
        timeRange,
        maxPatterns: 20,
      });

      expect(query.size).toBe(0);
      expect(query.aggs?.patterns).toEqual({
        categorize_text: {
          field: 'message',
          size: 20,
          min_doc_count: 1,
        },
        aggs: {
          first_seen: { min: { field: '@timestamp' } },
          last_seen: { max: { field: '@timestamp' } },
          sample: {
            top_hits: {
              size: 1,
              _source: true,
              sort: [{ '@timestamp': { order: 'desc' } }],
            },
          },
        },
      });
    });

    it('filters to documents where field exists', () => {
      const query = buildCategorizeTextQuery({
        target: 'logs-*',
        field: 'message',
        timeRange,
        maxPatterns: 10,
      });

      expect(query.query?.bool?.filter).toContainEqual({
        exists: { field: 'message' },
      });
    });
  });
});
