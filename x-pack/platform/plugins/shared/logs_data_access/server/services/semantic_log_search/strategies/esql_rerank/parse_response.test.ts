/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { parseEsqlPatternResponse } from './parse_response';

describe('parseEsqlPatternResponse', () => {
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
          'Connection to timed out',
          100,
          '2024-01-01T00:00:00.000Z',
          '2024-01-01T12:00:00.000Z',
          'Connection to db-server timed out',
        ],
        [
          'User logged in',
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
      pattern: 'Connection to timed out',
      count: 100,
      firstSeen: '2024-01-01T00:00:00.000Z',
      lastSeen: '2024-01-01T12:00:00.000Z',
      sample: { message: 'Connection to db-server timed out' },
    });
    expect(patterns[1]).toEqual({
      field: 'message',
      pattern: 'User logged in',
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

  it('filters out rows missing timestamp columns', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'pattern', type: 'keyword' },
        { name: 'count', type: 'long' },
      ],
      values: [['Error pattern', 25]],
    };

    const patterns = parseEsqlPatternResponse(response);

    expect(patterns).toEqual([]);
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
        { name: 'first_seen', type: 'date' },
        { name: 'last_seen', type: 'date' },
      ],
      values: [
        [null, 10, 1704067200000, 1704153600000],
        ['Valid', null, 1704067200000, 1704153600000],
        ['Valid', 5, 1704067200000, 1704153600000],
      ],
    };

    const patterns = parseEsqlPatternResponse(response);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].pattern).toBe('Valid');
    expect(patterns[0].count).toBe(5);
  });

  it('maps _score to relevanceScore when present', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'pattern', type: 'keyword' },
        { name: 'count', type: 'long' },
        { name: 'first_seen', type: 'date' },
        { name: 'last_seen', type: 'date' },
        { name: '_score', type: 'double' },
      ],
      values: [
        ['Error pattern', 10, 1704067200000, 1704153600000, 3.46],
        ['Warning pattern', 5, 1704067200000, 1704153600000, -2.15],
      ],
    };

    const patterns = parseEsqlPatternResponse(response);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].relevanceScore).toBe(3.46);
    expect(patterns[1].relevanceScore).toBe(-2.15);
  });

  it('omits relevanceScore when _score is not present', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'pattern', type: 'keyword' },
        { name: 'count', type: 'long' },
        { name: 'first_seen', type: 'date' },
        { name: 'last_seen', type: 'date' },
      ],
      values: [['Error pattern', 10, 1704067200000, 1704153600000]],
    };

    const patterns = parseEsqlPatternResponse(response);

    expect(patterns).toHaveLength(1);
    expect(patterns[0]).not.toHaveProperty('relevanceScore');
  });

  it('skips rows with non-string / non-number timestamp values without throwing', () => {
    // `toIsoString` narrows the `unknown` wire value before constructing `Date`; an unusable
    // value returns undefined and skips the row rather than throwing RangeError.
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'pattern', type: 'keyword' },
        { name: 'count', type: 'long' },
        { name: 'first_seen', type: 'date' },
        { name: 'last_seen', type: 'date' },
      ],
      values: [
        ['Valid pattern', 5, 1704067200000, 1704153600000],
        ['Bad timestamp row', 3, { not: 'a timestamp' }, 1704153600000],
        ['Another valid', 2, 1704067200000, 1704153600000],
      ],
    };

    let patterns: ReturnType<typeof parseEsqlPatternResponse>;
    expect(() => {
      patterns = parseEsqlPatternResponse(response);
    }).not.toThrow();
    expect(patterns!).toHaveLength(2);
    expect(patterns![0].pattern).toBe('Valid pattern');
    expect(patterns![1].pattern).toBe('Another valid');
  });
});
