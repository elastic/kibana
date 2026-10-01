/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyDistributionChartType } from '@kbn/apm-types';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { latencyOverallSpanDistributionRoute } from './overall_span_distribution';
import { latencyOverallTransactionDistributionRoute } from './overall_transaction_distribution';

const baseBody = {
  environment: 'production',
  kuery: '',
  start: '2023-01-01T00:00:00.000Z',
  end: '2023-01-02T00:00:00.000Z',
  percentileThreshold: '95',
  chartType: LatencyDistributionChartType.spanLatency,
};

describe('latencyOverallSpanDistributionRoute params', () => {
  it('accepts the minimal required body', () => {
    const result = latencyOverallSpanDistributionRoute.params!.shape.body.safeParse(baseBody);

    expectParseSuccess(result);
    expect(result.data.percentileThreshold).toEqual(95);
  });

  it('accepts optional fields, including a mixed string/number termFilters value', () => {
    const result = latencyOverallSpanDistributionRoute.params!.shape.body.safeParse({
      ...baseBody,
      serviceName: 'opbeans-java',
      spanName: 'GET /api',
      durationMin: '100',
      durationMax: '2000',
      isOtel: true,
      termFilters: [
        { fieldName: 'foo', fieldValue: 'bar' },
        { fieldName: 'baz', fieldValue: 42 },
      ],
    });

    expectParseSuccess(result);
    expect(result.data.termFilters).toEqual([
      { fieldName: 'foo', fieldValue: 'bar' },
      { fieldName: 'baz', fieldValue: 42 },
    ]);
  });

  it('rejects a missing percentileThreshold', () => {
    const { percentileThreshold, ...withoutThreshold } = baseBody;

    const result =
      latencyOverallSpanDistributionRoute.params!.shape.body.safeParse(withoutThreshold);

    expectParseError(result);
  });

  it('rejects an unknown chartType', () => {
    const result = latencyOverallSpanDistributionRoute.params!.shape.body.safeParse({
      ...baseBody,
      chartType: 'not_a_real_chart',
    });

    expectParseError(result);
  });
});

describe('latencyOverallTransactionDistributionRoute params', () => {
  it('accepts the minimal required body', () => {
    const result =
      latencyOverallTransactionDistributionRoute.params!.shape.body.safeParse(baseBody);

    expectParseSuccess(result);
  });

  it('accepts optional transaction-specific fields', () => {
    const result = latencyOverallTransactionDistributionRoute.params!.shape.body.safeParse({
      ...baseBody,
      serviceName: 'opbeans-java',
      transactionName: 'GET /api',
      transactionType: 'request',
    });

    expectParseSuccess(result);
  });

  it('rejects a missing required field', () => {
    const { environment, ...withoutEnvironment } = baseBody;

    const result =
      latencyOverallTransactionDistributionRoute.params!.shape.body.safeParse(withoutEnvironment);

    expectParseError(result);
  });
});
