/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { ApmTimeseriesType, getApmTimeseriesRt } from './apm_timeseries';
import { LatencyAggregationType } from './latency_aggregation_types';

function baseStat(timeseries: Record<string, unknown>) {
  return {
    stats: [
      {
        'service.name': 'opbeans-java',
        title: 'Latency',
        timeseries,
      },
    ],
    start: 'now-15m',
    end: 'now',
  };
}

describe('getApmTimeseriesRt', () => {
  it('parses a transaction throughput/failure rate stat', () => {
    const result = getApmTimeseriesRt.safeParse(
      baseStat({
        name: ApmTimeseriesType.transactionThroughput,
        'transaction.type': 'request',
        'transaction.name': 'GET /api',
      })
    );

    expectParseSuccess(result);
    expect(result.data.stats[0].timeseries).toEqual({
      name: ApmTimeseriesType.transactionThroughput,
      'transaction.type': 'request',
      'transaction.name': 'GET /api',
    });
  });

  it('parses an exit span stat without the optional resource field', () => {
    const result = getApmTimeseriesRt.safeParse(
      baseStat({
        name: ApmTimeseriesType.exitSpanLatency,
      })
    );

    expectParseSuccess(result);
    expect(result.data.stats[0].timeseries).toEqual({ name: ApmTimeseriesType.exitSpanLatency });
  });

  it('parses a transaction latency stat and requires `function`', () => {
    const result = getApmTimeseriesRt.safeParse(
      baseStat({
        name: ApmTimeseriesType.transactionLatency,
        function: LatencyAggregationType.p95,
      })
    );

    expectParseSuccess(result);

    const missingFunction = getApmTimeseriesRt.safeParse(
      baseStat({
        name: ApmTimeseriesType.transactionLatency,
      })
    );

    expectParseError(missingFunction);
  });

  it('parses an error event rate stat', () => {
    const result = getApmTimeseriesRt.safeParse(
      baseStat({
        name: ApmTimeseriesType.errorEventRate,
      })
    );

    expectParseSuccess(result);
  });

  it('accepts the top-level optional filter/offset/environment fields', () => {
    const result = getApmTimeseriesRt.safeParse({
      stats: [
        {
          'service.name': 'opbeans-java',
          title: 'Latency',
          filter: 'processor.event:transaction',
          offset: '1d',
          'service.environment': 'production',
          timeseries: { name: ApmTimeseriesType.errorEventRate },
        },
      ],
      start: 'now-15m',
      end: 'now',
    });

    expectParseSuccess(result);
  });

  it('rejects an unknown timeseries name', () => {
    const result = getApmTimeseriesRt.safeParse(baseStat({ name: 'not_a_real_type' }));

    expectParseError(result);
  });

  it('rejects a missing required field', () => {
    const result = getApmTimeseriesRt.safeParse({
      stats: [{ title: 'Latency', timeseries: { name: ApmTimeseriesType.errorEventRate } }],
      start: 'now-15m',
      end: 'now',
    });

    expectParseError(result);
  });
});
