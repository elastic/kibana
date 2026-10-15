/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { transactionChartsBreakdownRoute } from './breakdown';
import { transactionChartsColdstartRateByTransactionNameRoute } from './coldstart_rate_by_transaction_name';
import { transactionChartsColdstartRateRoute } from './coldstart_rate';
import { transactionChartsErrorRateRoute } from './error_rate';
import { transactionGroupsDetailedStatisticsRoute } from './groups_detailed_statistics';
import { transactionGroupsMainStatisticsRoute } from './groups_main_statistics';
import { transactionLatencyChartsRoute } from './latency_charts';
import { transactionTraceSamplesRoute } from './trace_samples';

describe('transactionChartsBreakdownRoute params', () => {
  it('accepts a valid query without the optional transactionName', () => {
    const result = transactionChartsBreakdownRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing transactionType', () => {
    const result = transactionChartsBreakdownRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

describe('transactionChartsColdstartRateRoute params', () => {
  it('accepts a valid query with an optional offset', () => {
    const result = transactionChartsColdstartRateRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        offset: '1d',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing path param', () => {
    const result = transactionChartsColdstartRateRoute.params!.safeParse({
      path: {},
      query: {
        transactionType: 'request',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

describe('transactionChartsColdstartRateByTransactionNameRoute params', () => {
  it('accepts a valid query', () => {
    const result = transactionChartsColdstartRateByTransactionNameRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        transactionName: 'GET /api',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing transactionName', () => {
    const result = transactionChartsColdstartRateByTransactionNameRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

describe('transactionChartsErrorRateRoute params', () => {
  it('accepts a valid query and coerces bucketSizeInSeconds', () => {
    const result = transactionChartsErrorRateRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        bucketSizeInSeconds: '60',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.bucketSizeInSeconds).toBe(60);
    }
  });

  it('rejects an invalid bucketSizeInSeconds', () => {
    const result = transactionChartsErrorRateRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        bucketSizeInSeconds: 'not-a-number',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseError(result);
  });
});

describe('transactionGroupsDetailedStatisticsRoute params', () => {
  it('accepts a valid query and parses transactionNames JSON', () => {
    const result = transactionGroupsDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
        bucketSizeInSeconds: '60',
        useDurationSummary: 'true',
        transactionNames: JSON.stringify(['GET /api', 'POST /api']),
        transactionType: 'request',
        latencyAggregationType: 'avg',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.transactionNames).toEqual(['GET /api', 'POST /api']);
      expect(result.data.query.useDurationSummary).toBe(true);
    }
  });

  it('rejects a transactionNames value that is not valid JSON', () => {
    const result = transactionGroupsDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
        bucketSizeInSeconds: '60',
        useDurationSummary: 'true',
        transactionNames: 'not-json',
        transactionType: 'request',
        latencyAggregationType: 'avg',
      },
    });

    expectParseError(result);
  });
});

describe('transactionGroupsMainStatisticsRoute params', () => {
  it('accepts a valid query without the optional searchQuery', () => {
    const result = transactionGroupsMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        kuery: '',
        useDurationSummary: 'false',
        transactionType: 'request',
        latencyAggregationType: 'p95',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing kuery', () => {
    const result = transactionGroupsMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        useDurationSummary: 'false',
        transactionType: 'request',
        latencyAggregationType: 'p95',
        documentType: 'transactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseError(result);
  });
});

describe('transactionLatencyChartsRoute params', () => {
  it('accepts a valid query without the optional transactionType/transactionName/filters', () => {
    const result = transactionLatencyChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        latencyAggregationType: 'avg',
        bucketSizeInSeconds: '60',
        useDurationSummary: 'true',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'serviceTransactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects an invalid latencyAggregationType', () => {
    const result = transactionLatencyChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        latencyAggregationType: 'not-a-valid-type',
        bucketSizeInSeconds: '60',
        useDurationSummary: 'true',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'serviceTransactionMetric',
        rollupInterval: '1m',
      },
    });

    expectParseError(result);
  });
});

describe('transactionTraceSamplesRoute params', () => {
  it('accepts a valid query without the optional fields', () => {
    const result = transactionTraceSamplesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        transactionName: 'GET /api',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts optional sampleRangeFrom/sampleRangeTo and coerces them', () => {
    const result = transactionTraceSamplesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        transactionName: 'GET /api',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        sampleRangeFrom: '0',
        sampleRangeTo: '1000',
      },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data.query.sampleRangeFrom).toBe(0);
      expect(result.data.query.sampleRangeTo).toBe(1000);
    }
  });

  it('rejects a query missing transactionName', () => {
    const result = transactionTraceSamplesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        transactionType: 'request',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});
