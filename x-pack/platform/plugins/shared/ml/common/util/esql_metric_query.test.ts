/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import {
  buildEsqlCardinalityRequest,
  buildEsqlMetricRequest,
  ESQL_MAX_CHART_BUCKETS,
  escapeEsqlIdentifier,
  getEsqlChartBucketCount,
  getEsqlMetricExpression,
  isEsqlDatafeed,
  parseEsqlMetricResponse,
  type EsqlMetricQueryOptions,
} from './esql_metric_query';

const HOUR = 60 * 60 * 1000;

const baseOptions: EsqlMetricQueryOptions = {
  esqlQuery:
    'FROM logs | STATS event_count = COUNT(*) BY bucket_time = BUCKET(@timestamp, 1 hour), host = host.keyword',
  sourceTimeField: '@timestamp',
  timeField: 'bucket_time',
  entityFields: [],
  metricFunction: 'sum',
  metricFieldName: 'event_count',
  earliestMs: 0,
  latestMs: 3 * HOUR,
  intervalMs: HOUR,
};

describe('esql_metric_query', () => {
  describe('isEsqlDatafeed', () => {
    test('returns true only when esql_query and source_time_field are set', () => {
      expect(
        isEsqlDatafeed({ esql_query: 'FROM logs', source_time_field: '@timestamp' } as Datafeed)
      ).toBe(true);
      expect(isEsqlDatafeed({ esql_query: 'FROM logs' } as Datafeed)).toBe(false);
      expect(isEsqlDatafeed({ indices: ['logs'] } as Datafeed)).toBe(false);
      expect(isEsqlDatafeed(undefined)).toBe(false);
    });
  });

  describe('escapeEsqlIdentifier', () => {
    test('wraps in backticks and doubles embedded backticks', () => {
      expect(escapeEsqlIdentifier('host.name')).toBe('`host.name`');
      expect(escapeEsqlIdentifier('a`b')).toBe('`a``b`');
    });
  });

  describe('getEsqlMetricExpression', () => {
    test.each([
      ['count', undefined, 'COUNT(*)'],
      ['avg', 'bytes', 'AVG(`bytes`)'],
      ['sum', 'bytes', 'SUM(`bytes`)'],
      ['min', 'bytes', 'MIN(`bytes`)'],
      ['max', 'bytes', 'MAX(`bytes`)'],
      ['percentiles', 'bytes', 'MEDIAN(`bytes`)'],
      ['cardinality', 'clientip', 'COUNT_DISTINCT(`clientip`)'],
    ])('maps %s(%s) to %s', (metricFunction, metricFieldName, expected) => {
      expect(getEsqlMetricExpression(metricFunction, metricFieldName)).toBe(expected);
    });

    test('returns undefined for unsupported functions', () => {
      expect(getEsqlMetricExpression('lat_long', 'location')).toBeUndefined();
      expect(getEsqlMetricExpression('avg', undefined)).toBeUndefined();
      expect(getEsqlMetricExpression(null, undefined)).toBeUndefined();
    });
  });

  describe('buildEsqlMetricRequest', () => {
    test('appends re-bucketing to the datafeed query and filters on the source time field', () => {
      const request = buildEsqlMetricRequest(baseOptions);

      expect(request).toEqual({
        query: [
          baseOptions.esqlQuery,
          '| STATS `__ml_metric` = SUM(`event_count`) BY `__ml_chart_time` = BUCKET(`bucket_time`, 3600000 milliseconds)',
          '| SORT `__ml_chart_time`',
          '| LIMIT 4',
        ].join('\n'),
        params: [],
        filter: {
          range: {
            '@timestamp': { gte: 0, lte: 3 * HOUR, format: 'epoch_millis' },
          },
        },
      });
    });

    test('passes entity values as named params and handles blank values', () => {
      const request = buildEsqlMetricRequest({
        ...baseOptions,
        entityFields: [
          { fieldName: 'host', fieldValue: 'www.elastic.co" | DROP *' },
          { fieldName: 'geo.src', fieldValue: '' },
        ],
      });

      expect(request?.params).toEqual([{ ml_entity_0: 'www.elastic.co" | DROP *' }]);
      expect(request?.query).toContain('| WHERE TO_STRING(`host`) == ?ml_entity_0');
      expect(request?.query).toContain('| WHERE (`geo.src` IS NULL OR TO_STRING(`geo.src`) == "")');
      expect(request?.query).not.toContain('DROP');
    });

    test('caps the row limit', () => {
      const request = buildEsqlMetricRequest({
        ...baseOptions,
        latestMs: 100000 * HOUR,
      });
      expect(request?.query).toContain('| LIMIT 10000');
    });

    test('returns undefined when the function cannot be charted', () => {
      expect(
        buildEsqlMetricRequest({ ...baseOptions, metricFunction: 'lat_long' })
      ).toBeUndefined();
    });
  });

  describe('buildEsqlCardinalityRequest', () => {
    test('counts distinct values of each field', () => {
      expect(
        buildEsqlCardinalityRequest({
          esqlQuery: 'FROM logs',
          sourceTimeField: '@timestamp',
          fieldNames: ['host', 'geo.src'],
          earliestMs: 0,
          latestMs: HOUR,
        })
      ).toEqual({
        query: [
          'FROM logs',
          '| STATS `__ml_cardinality_0` = COUNT_DISTINCT(`host`), `__ml_cardinality_1` = COUNT_DISTINCT(`geo.src`)',
          '| LIMIT 1',
        ].join('\n'),
        params: [],
        filter: { range: { '@timestamp': { gte: 0, lte: HOUR, format: 'epoch_millis' } } },
      });
    });
  });

  describe('getEsqlChartBucketCount', () => {
    test('counts buckets from the interval-aligned start to the latest time', () => {
      expect(getEsqlChartBucketCount(0, 3 * HOUR, HOUR)).toBe(4);
      expect(getEsqlChartBucketCount(HOUR / 2, 2 * HOUR, HOUR)).toBe(3);
    });

    test('returns 0 when latest is before the first bucket', () => {
      expect(getEsqlChartBucketCount(2 * HOUR, HOUR, HOUR)).toBe(0);
    });
  });

  describe('parseEsqlMetricResponse', () => {
    const columns = [{ name: '__ml_metric' }, { name: '__ml_chart_time' }];

    test('keys results by epoch ms and fills missing buckets with null', () => {
      const results = parseEsqlMetricResponse(
        {
          columns,
          values: [
            [10, '1970-01-01T01:00:00.000Z'],
            [5, '1970-01-01T03:00:00.000Z'],
          ],
        },
        baseOptions
      );

      expect(results).toEqual({
        0: null,
        [HOUR]: 10,
        [2 * HOUR]: null,
        [3 * HOUR]: 5,
      });
    });

    test('fills missing buckets with 0 for count charts', () => {
      const results = parseEsqlMetricResponse(
        { columns, values: [[2, HOUR]] },
        { ...baseOptions, metricFunction: 'count', metricFieldName: undefined }
      );

      expect(results).toEqual({ 0: 0, [HOUR]: 2, [2 * HOUR]: 0, [3 * HOUR]: 0 });
    });

    test('aligns the first bucket to the interval', () => {
      const results = parseEsqlMetricResponse(
        { columns, values: [] },
        { ...baseOptions, earliestMs: HOUR / 2, latestMs: 2 * HOUR }
      );

      expect(Object.keys(results).map(Number)).toEqual([0, HOUR, 2 * HOUR]);
    });

    test('caps the number of filled buckets', () => {
      const results = parseEsqlMetricResponse(
        { columns, values: [] },
        { ...baseOptions, earliestMs: 0, latestMs: Number.MAX_SAFE_INTEGER, intervalMs: 1 }
      );

      expect(Object.keys(results)).toHaveLength(ESQL_MAX_CHART_BUCKETS);
    });
  });
});
