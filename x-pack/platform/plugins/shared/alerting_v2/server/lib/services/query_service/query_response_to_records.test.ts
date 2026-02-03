/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { queryResponseToRecords } from './query_response_to_records';

describe('queryResponseToRecords', () => {
  it('should convert ES|QL response to array of objects', () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [
        { name: 'rule_id', type: 'keyword' },
        { name: 'alert_series_id', type: 'keyword' },
        { name: '@timestamp', type: 'date' },
      ],
      values: [
        ['rule-1', 'series-1', '2026-01-02T10:29:31.019Z'],
        ['rule-2', 'series-2', '2026-01-02T10:29:31.019Z'],
      ],
    };

    const result = queryResponseToRecords(mockResponse);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        '@timestamp': '2026-01-02T10:29:31.019Z',
        rule_id: 'rule-1',
        alert_series_id: 'series-1',
      },
      {
        '@timestamp': '2026-01-02T10:29:31.019Z',
        rule_id: 'rule-2',
        alert_series_id: 'series-2',
      },
    ]);
  });

  it('should handle missing column names in response', () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [
        { name: 'rule_id', type: 'keyword' },
        { name: 'alert_series_id', type: 'keyword' },
      ],
      values: [
        ['rule-1', 'series-1', '2026-01-02T10:29:31.019Z'],
        ['rule-2', 'series-2', '2026-01-02T10:29:31.019Z'],
      ],
    };

    const result = queryResponseToRecords(mockResponse);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        rule_id: 'rule-1',
        alert_series_id: 'series-1',
      },
      {
        rule_id: 'rule-2',
        alert_series_id: 'series-2',
      },
    ]);
  });

  it('should handle empty values response', () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [{ name: 'field', type: 'keyword' }],
      values: [],
    };

    const result = queryResponseToRecords<{ field: string }>(mockResponse);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle empty columns response', () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [],
      values: [['value']],
    };

    const result = queryResponseToRecords<{ field: string }>(mockResponse);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should un-flatten column names with dots into nested objects', () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [
        { name: 'rule.id', type: 'keyword' },
        { name: 'rule.name', type: 'keyword' },
        { name: 'alert_series_id', type: 'keyword' },
      ],
      values: [
        ['rule-1', 'Test Rule', 'series-1'],
        ['rule-2', 'Another Rule', 'series-2'],
      ],
    };

    const result = queryResponseToRecords(mockResponse);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        rule: {
          id: 'rule-1',
          name: 'Test Rule',
        },
        alert_series_id: 'series-1',
      },
      {
        rule: {
          id: 'rule-2',
          name: 'Another Rule',
        },
        alert_series_id: 'series-2',
      },
    ]);
  });

  it('should handle multiple levels of nesting', () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [
        { name: 'a.b.c', type: 'keyword' },
        { name: 'a.b.d', type: 'keyword' },
        { name: 'x.y', type: 'keyword' },
      ],
      values: [['value1', 'value2', 'value3']],
    };

    const result = queryResponseToRecords(mockResponse);

    expect(result).toHaveLength(1);
    expect(result).toEqual([
      {
        a: {
          b: {
            c: 'value1',
            d: 'value2',
          },
        },
        x: {
          y: 'value3',
        },
      },
    ]);
  });

  it('should handle mixed flattened and non-flattened column names', () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [
        { name: 'simple_field', type: 'keyword' },
        { name: 'nested.field', type: 'keyword' },
        { name: '@timestamp', type: 'date' },
      ],
      values: [['simple-value', 'nested-value', '2026-01-02T10:29:31.019Z']],
    };

    const result = queryResponseToRecords(mockResponse);

    expect(result).toHaveLength(1);
    expect(result).toEqual([
      {
        simple_field: 'simple-value',
        nested: {
          field: 'nested-value',
        },
        '@timestamp': '2026-01-02T10:29:31.019Z',
      },
    ]);
  });
});
