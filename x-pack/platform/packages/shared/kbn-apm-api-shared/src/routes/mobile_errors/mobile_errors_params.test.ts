/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { mobileErrorTermsRoute } from './mobile_error_terms';
import { mobileErrorsDetailedStatisticsRoute } from './mobile_errors_detailed_statistics';
import { mobileErrorsMainStatisticsRoute } from './mobile_errors_main_statistics';
import { mobileHttpErrorRateRoute } from './mobile_http_error_rate';

describe('mobileErrorTermsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = mobileErrorTermsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
        size: '10',
        fieldName: 'error.grouping_key',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing fieldName', () => {
    const result = mobileErrorTermsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
        size: '10',
      },
    });

    expectParseError(result);
  });

  it('rejects a missing serviceName', () => {
    const result = mobileErrorTermsRoute.params!.safeParse({
      path: {},
      query: {
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
        size: '10',
        fieldName: 'error.grouping_key',
      },
    });

    expectParseError(result);
  });
});

describe('mobileErrorsDetailedStatisticsRoute params', () => {
  it('accepts valid path, query and body', () => {
    const result = mobileErrorsDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        numBuckets: '20',
      },
      body: { groupIds: JSON.stringify(['groupId1', 'groupId2']) },
    });

    expectParseSuccess(result);
  });

  it('rejects a body with a non-JSON groupIds', () => {
    const result = mobileErrorsDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        numBuckets: '20',
      },
      body: { groupIds: 'not-json' },
    });

    expectParseError(result);
  });

  it('rejects a missing serviceName', () => {
    const result = mobileErrorsDetailedStatisticsRoute.params!.safeParse({
      path: {},
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        numBuckets: '20',
      },
      body: { groupIds: JSON.stringify(['groupId1']) },
    });

    expectParseError(result);
  });
});

describe('mobileErrorsMainStatisticsRoute params', () => {
  it('accepts a query without optional sort fields', () => {
    const result = mobileErrorsMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts a query with sortField/sortDirection', () => {
    const result = mobileErrorsMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        sortField: 'occurrences',
        sortDirection: 'desc',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects an invalid sortDirection', () => {
    const result = mobileErrorsMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        sortDirection: 'invalid',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

describe('mobileHttpErrorRateRoute params', () => {
  it('accepts a query without an optional offset', () => {
    const result = mobileHttpErrorRateRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts a query with an optional offset', () => {
    const result = mobileHttpErrorRateRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        offset: '1d',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceName', () => {
    const result = mobileHttpErrorRateRoute.params!.safeParse({
      path: {},
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
