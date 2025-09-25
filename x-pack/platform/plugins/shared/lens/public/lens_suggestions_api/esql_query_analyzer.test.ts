/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldPreferLineChartForESQLQuery, analyzeESQLTimeSeriesPattern } from './esql_query_analyzer';

describe('esql_query_analyzer', () => {
  describe('shouldPreferLineChartForESQLQuery', () => {
    it('should return true for AVG with BUCKET(@timestamp)', () => {
      const query = {
        esql: 'FROM logs | STATS avg_response = AVG(response_time) BY BUCKET(@timestamp, 1h)',
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(true);
    });

    it('should return true for SUM with BUCKET(@timestamp)', () => {
      const query = {
        esql: 'FROM metrics | STATS total = SUM(bytes) BY BUCKET(@timestamp, 30m), host',
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(true);
    });

    it('should return true for MAX with BUCKET(timestamp_field)', () => {
      const query = {
        esql: 'FROM data | STATS max_cpu = MAX(cpu.percent) BY BUCKET(event.timestamp, 5m)',
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(true);
    });

    it('should return false for COUNT(*) with BUCKET(@timestamp)', () => {
      const query = {
        esql: 'FROM logs | STATS count = COUNT(*) BY BUCKET(@timestamp, 1h)',
      };

      // COUNT(*) should not prefer line chart - this is a histogram use case
      expect(shouldPreferLineChartForESQLQuery(query)).toBe(false);
    });

    it('should return false for AVG without BUCKET', () => {
      const query = {
        esql: 'FROM logs | STATS avg_response = AVG(response_time) BY host',
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(false);
    });

    it('should return false for BUCKET without aggregation', () => {
      const query = {
        esql: 'FROM logs | STATS BUCKET(@timestamp, 1h)',
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(false);
    });

    it('should return false for non-ES|QL queries', () => {
      const query = {
        query: '*',
        language: 'kuery',
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(false);
    });

    it('should handle null/undefined queries gracefully', () => {
      expect(shouldPreferLineChartForESQLQuery(null)).toBe(false);
      expect(shouldPreferLineChartForESQLQuery(undefined)).toBe(false);
    });

    it('should handle malformed ES|QL queries gracefully', () => {
      const query = {
        esql: 'FROM invalid syntax |||| STATS',
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(false);
    });

    it('should return true for complex multi-line queries with PERCENTILE', () => {
      const query = {
        esql: `FROM logs
               | WHERE response_time > 0
               | STATS 
                   p95_response = PERCENTILE(response_time, 95),
                   p99_response = PERCENTILE(response_time, 99)
                 BY BUCKET(@timestamp, 5m), service.name`,
      };

      expect(shouldPreferLineChartForESQLQuery(query)).toBe(true);
    });
  });

  describe('analyzeESQLTimeSeriesPattern', () => {
    it('should correctly analyze time series patterns', () => {
      const query = {
        esql: 'FROM logs | STATS avg_cpu = AVG(cpu.percent), max_memory = MAX(memory.usage) BY BUCKET(@timestamp, 1h)',
      };

      const result = analyzeESQLTimeSeriesPattern(query);

      expect(result).toEqual({
        isTimeSeries: true,
        hasNonCountAggregation: true,
        aggregationTypes: ['avg', 'max'],
        timestampFields: ['@timestamp'],
      });
    });

    it('should handle COUNT-only queries', () => {
      const query = {
        esql: 'FROM logs | STATS count = COUNT(*) BY BUCKET(@timestamp, 1h)',
      };

      const result = analyzeESQLTimeSeriesPattern(query);

      expect(result).toEqual({
        isTimeSeries: true,
        hasNonCountAggregation: false,
        aggregationTypes: ['count'],
        timestampFields: ['@timestamp'],
      });
    });

    it('should handle non-time-series queries', () => {
      const query = {
        esql: 'FROM logs | STATS avg_response = AVG(response_time) BY host',
      };

      const result = analyzeESQLTimeSeriesPattern(query);

      expect(result).toEqual({
        isTimeSeries: false,
        hasNonCountAggregation: true,
        aggregationTypes: ['avg'],
        timestampFields: [],
      });
    });

    it('should detect multiple timestamp fields', () => {
      const query = {
        esql: `FROM logs 
               | STATS created_events = COUNT(*) BY BUCKET(created_timestamp, 1h)
               | STATS updated_events = COUNT(*) BY BUCKET(updated_timestamp, 1h)`,
      };

      const result = analyzeESQLTimeSeriesPattern(query);

      expect(result.isTimeSeries).toBe(true);
      expect(result.timestampFields).toContain('created_timestamp');
      expect(result.timestampFields).toContain('updated_timestamp');
    });
  });
});
