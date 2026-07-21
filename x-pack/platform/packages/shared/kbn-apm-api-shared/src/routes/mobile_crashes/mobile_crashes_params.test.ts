/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { crashDetailedStatisticsRoute } from './crash_detailed_statistics';
import { crashDistributionRoute } from './crash_distribution';
import { crashMainStatisticsRoute } from './crash_main_statistics';

describe('crashDetailedStatisticsRoute params', () => {
  it('accepts valid path, query and body', () => {
    const result = crashDetailedStatisticsRoute.params!.safeParse({
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
    const result = crashDetailedStatisticsRoute.params!.safeParse({
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
    const result = crashDetailedStatisticsRoute.params!.safeParse({
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

describe('crashDistributionRoute params', () => {
  it('accepts a query without an optional groupId', () => {
    const result = crashDistributionRoute.params!.safeParse({
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

  it('accepts a query with an optional groupId and offset', () => {
    const result = crashDistributionRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        groupId: 'groupId1',
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
    const result = crashDistributionRoute.params!.safeParse({
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

describe('crashMainStatisticsRoute params', () => {
  it('accepts a query without optional sort fields', () => {
    const result = crashMainStatisticsRoute.params!.safeParse({
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
    const result = crashMainStatisticsRoute.params!.safeParse({
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
    const result = crashMainStatisticsRoute.params!.safeParse({
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
