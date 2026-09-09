/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
import { servicesFlamegraphRoute } from './flamegraph';
import { servicesFunctionsRoute } from './functions';
import { profilingHostsFlamegraphRoute } from './hosts_flamegraph';
import { profilingHostsFunctionsRoute } from './hosts_functions';

describe('servicesFlamegraphRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = servicesFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        transactionType: 'request',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing transactionType', () => {
    const result = servicesFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

describe('servicesFunctionsRoute params', () => {
  it('accepts a valid path and query, coercing indices to numbers', () => {
    const result = servicesFunctionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        startIndex: '0',
        endIndex: '10',
        transactionType: 'request',
      },
    });

    expectParseSuccess(result);
    expect(result.data?.query.startIndex).toBe(0);
    expect(result.data?.query.endIndex).toBe(10);
  });

  it('rejects a missing serviceName', () => {
    const result = servicesFunctionsRoute.params!.safeParse({
      path: {},
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        startIndex: '0',
        endIndex: '10',
        transactionType: 'request',
      },
    });

    expectParseError(result);
  });
});

describe('profilingHostsFlamegraphRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = profilingHostsFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects an invalid documentType', () => {
    const result = profilingHostsFlamegraphRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: 'notARealDocumentType',
        rollupInterval: RollupInterval.OneMinute,
      },
    });

    expectParseError(result);
  });
});

describe('profilingHostsFunctionsRoute params', () => {
  it('accepts a valid path and query, coercing indices to numbers', () => {
    const result = profilingHostsFunctionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
        startIndex: '0',
        endIndex: '10',
      },
    });

    expectParseSuccess(result);
    expect(result.data?.query.startIndex).toBe(0);
    expect(result.data?.query.endIndex).toBe(10);
  });

  it('rejects a missing rollupInterval', () => {
    const result = profilingHostsFunctionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        kuery: '',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        documentType: ApmDocumentType.TransactionMetric,
        startIndex: '0',
        endIndex: '10',
      },
    });

    expectParseError(result);
  });
});
