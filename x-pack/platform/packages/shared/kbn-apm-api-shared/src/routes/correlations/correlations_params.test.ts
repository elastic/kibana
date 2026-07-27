/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { fieldCandidatesTransactionsRoute } from './field_candidates_transactions';
import { fieldValuePairsTransactionsRoute } from './field_value_pairs_transactions';
import { fieldValueStatsTransactionsRoute } from './field_value_stats_transactions';
import { pValuesTransactionsRoute } from './p_values_transactions';
import { significantCorrelationsTransactionsRoute } from './significant_correlations_transactions';
import { unifiedCorrelationsRoute } from './unified_correlations';

describe('fieldCandidatesTransactionsRoute params', () => {
  it('accepts a query with only the required fields', () => {
    const result = fieldCandidatesTransactionsRoute.params!.safeParse({
      query: { environment: 'production', kuery: '', start: '2021-01-01', end: '2021-01-02' },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing the required range', () => {
    expectParseError(
      fieldCandidatesTransactionsRoute.params!.safeParse({
        query: { environment: 'production', kuery: '' },
      })
    );
  });
});

describe('fieldValuePairsTransactionsRoute params', () => {
  it('accepts a body with only the required fields', () => {
    const result = fieldValuePairsTransactionsRoute.params!.safeParse({
      body: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01',
        end: '2021-01-02',
        fieldCandidates: ['field1', 'field2'],
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a body missing the required fieldCandidates', () => {
    expectParseError(
      fieldValuePairsTransactionsRoute.params!.safeParse({
        body: { environment: 'production', kuery: '', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });
});

describe('fieldValueStatsTransactionsRoute params', () => {
  it('accepts a query with only the required fields', () => {
    const result = fieldValueStatsTransactionsRoute.params!.safeParse({
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01',
        end: '2021-01-02',
        fieldName: 'foo',
        fieldValue: 'bar',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing the required fieldName/fieldValue', () => {
    expectParseError(
      fieldValueStatsTransactionsRoute.params!.safeParse({
        query: { environment: 'production', kuery: '', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });
});

describe('pValuesTransactionsRoute params', () => {
  it('accepts a body with only the required fields', () => {
    const result = pValuesTransactionsRoute.params!.safeParse({
      body: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01',
        end: '2021-01-02',
        fieldCandidates: ['field1'],
      },
    });

    expectParseSuccess(result);
  });

  it('coerces optional durationMin/durationMax to numbers', () => {
    const result = pValuesTransactionsRoute.params!.safeParse({
      body: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01',
        end: '2021-01-02',
        fieldCandidates: ['field1'],
        durationMin: '10',
        durationMax: '20',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a body missing the required fieldCandidates', () => {
    expectParseError(
      pValuesTransactionsRoute.params!.safeParse({
        body: { environment: 'production', kuery: '', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });
});

describe('significantCorrelationsTransactionsRoute params', () => {
  it('accepts a body with only the required fields', () => {
    const result = significantCorrelationsTransactionsRoute.params!.safeParse({
      body: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01',
        end: '2021-01-02',
        fieldValuePairs: [{ fieldName: 'foo', fieldValue: 'bar' }],
      },
    });

    expectParseSuccess(result);
  });

  it('coerces a numeric fieldValue', () => {
    const result = significantCorrelationsTransactionsRoute.params!.safeParse({
      body: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01',
        end: '2021-01-02',
        fieldValuePairs: [{ fieldName: 'foo', fieldValue: '42' }],
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a body missing the required fieldValuePairs', () => {
    expectParseError(
      significantCorrelationsTransactionsRoute.params!.safeParse({
        body: { environment: 'production', kuery: '', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });
});

describe('unifiedCorrelationsRoute params', () => {
  it('accepts a body with only the required fields', () => {
    const result = unifiedCorrelationsRoute.params!.safeParse({
      body: {
        entityType: 'transaction',
        metric: 'latency',
        start: '2021-01-01',
        end: '2021-01-02',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts optional fields, coercing durationMin/durationMax/percentileThreshold/includeHistogram', () => {
    const result = unifiedCorrelationsRoute.params!.safeParse({
      body: {
        entityType: 'exit_span',
        metric: 'throughput',
        start: '2021-01-01',
        end: '2021-01-02',
        environment: 'production',
        serviceName: 'opbeans-java',
        durationMin: '10',
        durationMax: '20',
        percentileThreshold: '95',
        includeHistogram: 'true',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects an invalid entityType', () => {
    expectParseError(
      unifiedCorrelationsRoute.params!.safeParse({
        body: { entityType: 'invalid', metric: 'latency', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });

  it('rejects a missing metric', () => {
    expectParseError(
      unifiedCorrelationsRoute.params!.safeParse({
        body: { entityType: 'transaction', start: '2021-01-01', end: '2021-01-02' },
      })
    );
  });

  it('rejects a body missing the required range', () => {
    expectParseError(
      unifiedCorrelationsRoute.params!.safeParse({
        body: { entityType: 'transaction', metric: 'latency' },
      })
    );
  });
});
