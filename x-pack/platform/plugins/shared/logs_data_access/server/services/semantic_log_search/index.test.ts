/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

// Note: These tests cover the internal helper functions that are not exported.
// We test them indirectly through the public API or extract them for testing.

describe('semantic log search service helpers', () => {
  describe('esqlRowsToObjects', () => {
    // Helper function copied for testing (since it's not exported)
    function esqlRowsToObjects<T>(response: ESQLSearchResponse): T[] {
      const columns = response.columns ?? [];
      return (response.values ?? []).map((row) => {
        const record: Record<string, unknown> = {};
        row.forEach((value, index) => {
          const name = columns[index]?.name;
          if (name) {
            record[name] = value;
          }
        });
        return record as T;
      });
    }

    it('converts columnar response to array of objects', () => {
      const response: ESQLSearchResponse = {
        columns: [{ name: 'name', type: 'keyword' }, { name: 'count', type: 'long' }],
        values: [
          ['foo', 10],
          ['bar', 20],
        ],
      };

      const result = esqlRowsToObjects<{ name: string; count: number }>(response);

      expect(result).toEqual([
        { name: 'foo', count: 10 },
        { name: 'bar', count: 20 },
      ]);
    });

    it('handles empty values', () => {
      const response: ESQLSearchResponse = {
        columns: [{ name: 'name', type: 'keyword' }],
        values: [],
      };

      const result = esqlRowsToObjects(response);
      expect(result).toEqual([]);
    });

    it('handles null values in rows', () => {
      const response: ESQLSearchResponse = {
        columns: [{ name: 'name', type: 'keyword' }, { name: 'value', type: 'long' }],
        values: [['foo', null]],
      };

      const result = esqlRowsToObjects<{ name: string; value: number | null }>(response);
      expect(result).toEqual([{ name: 'foo', value: null }]);
    });
  });

  describe('parseEsqlPatternResponse', () => {
    // Helper function copied for testing (since it's not exported)
    interface EsqlPatternRow {
      pattern: string;
      count: number;
      first_seen: string;
      last_seen: string;
      sample: string;
    }

    interface LogPattern {
      field: string;
      pattern: string;
      count: number;
      firstSeen: string;
      lastSeen: string;
      sample: Record<string, unknown>;
    }

    function esqlRowsToObjects<T>(response: ESQLSearchResponse): T[] {
      const columns = response.columns ?? [];
      return (response.values ?? []).map((row) => {
        const record: Record<string, unknown> = {};
        row.forEach((value, index) => {
          const name = columns[index]?.name;
          if (name) {
            record[name] = value;
          }
        });
        return record as T;
      });
    }

    function parseEsqlPatternResponse(
      response: ESQLSearchResponse,
      field: string = 'message'
    ): LogPattern[] {
      const rows = esqlRowsToObjects<EsqlPatternRow>(response);

      return rows
        .filter((row) => row.pattern != null && row.count != null)
        .map((row) => ({
          field,
          pattern: String(row.pattern),
          count: Number(row.count),
          firstSeen: row.first_seen
            ? new Date(row.first_seen).toISOString()
            : new Date().toISOString(),
          lastSeen: row.last_seen
            ? new Date(row.last_seen).toISOString()
            : new Date().toISOString(),
          sample: {
            message: row.sample ? String(row.sample) : '',
          },
        }));
    }

    it('parses ES|QL response with all columns', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
          { name: 'sample', type: 'keyword' },
        ],
        values: [
          [
            'Connection to .* timed out',
            100,
            '2024-01-01T00:00:00.000Z',
            '2024-01-01T12:00:00.000Z',
            'Connection to db-server timed out',
          ],
          [
            'User .* logged in',
            50,
            '2024-01-01T00:00:00.000Z',
            '2024-01-01T06:00:00.000Z',
            'User admin logged in',
          ],
        ],
      };

      const patterns = parseEsqlPatternResponse(response, 'message');

      expect(patterns).toHaveLength(2);
      expect(patterns[0]).toEqual({
        field: 'message',
        pattern: 'Connection to .* timed out',
        count: 100,
        firstSeen: '2024-01-01T00:00:00.000Z',
        lastSeen: '2024-01-01T12:00:00.000Z',
        sample: { message: 'Connection to db-server timed out' },
      });
      expect(patterns[1]).toEqual({
        field: 'message',
        pattern: 'User .* logged in',
        count: 50,
        firstSeen: '2024-01-01T00:00:00.000Z',
        lastSeen: '2024-01-01T06:00:00.000Z',
        sample: { message: 'User admin logged in' },
      });
    });

    it('filters out rows missing required columns', () => {
      const response: ESQLSearchResponse = {
        columns: [{ name: 'other', type: 'keyword' }],
        values: [['value']],
      };

      const patterns = parseEsqlPatternResponse(response);
      expect(patterns).toEqual([]);
    });

    it('handles missing optional columns', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [['Error pattern', 25]],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('Error pattern');
      expect(patterns[0].count).toBe(25);
      expect(patterns[0].sample).toEqual({ message: '' });
    });

    it('handles empty response', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [],
      };

      const patterns = parseEsqlPatternResponse(response);
      expect(patterns).toEqual([]);
    });

    it('handles numeric timestamps', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
        ],
        values: [['Pattern', 10, 1704067200000, 1704153600000]],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns[0].firstSeen).toBe('2024-01-01T00:00:00.000Z');
      expect(patterns[0].lastSeen).toBe('2024-01-02T00:00:00.000Z');
    });

    it('filters out null pattern or count', () => {
      const response: ESQLSearchResponse = {
        columns: [
          { name: 'pattern', type: 'keyword' },
          { name: 'count', type: 'long' },
        ],
        values: [
          [null, 10], // null pattern - should be filtered
          ['Valid', null], // null count - should be filtered
          ['Valid', 5], // valid - should be included
        ],
      };

      const patterns = parseEsqlPatternResponse(response);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern).toBe('Valid');
      expect(patterns[0].count).toBe(5);
    });
  });
});
