/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { mobileDetailedStatisticsRoute } from './mobile_detailed_statistics';
import { mobileFiltersRoute } from './mobile_filters';
import { mobileHttpRequestsRoute } from './mobile_http_requests';
import { mobileLocationStatsRoute } from './mobile_location_stats';
import { mobileMainStatisticsRoute } from './mobile_main_statistics';
import { mobileMostUsedChartsRoute } from './mobile_most_used_charts';
import { mobileSessionsRoute } from './mobile_sessions';
import { mobileStatsRoute } from './mobile_stats';
import { mobileTermsByFieldRoute } from './mobile_terms_by_field';

const range = {
  start: '2021-01-01T00:00:00.000Z',
  end: '2021-01-02T00:00:00.000Z',
};

describe('mobileDetailedStatisticsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = mobileDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
        field: 'device.manufacturer',
        fieldValues: JSON.stringify(['Apple', 'Samsung']),
      },
    });

    expectParseSuccess(result);
  });

  it('rejects fieldValues that is not valid JSON', () => {
    const result = mobileDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
        field: 'device.manufacturer',
        fieldValues: 'not-json',
      },
    });

    expectParseError(result);
  });
});

describe('mobileFiltersRoute params', () => {
  it('accepts a query without the optional transactionType', () => {
    const result = mobileFiltersRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing the required kuery', () => {
    const result = mobileFiltersRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        environment: 'production',
      },
    });

    expectParseError(result);
  });
});

describe('mobileHttpRequestsRoute params', () => {
  it('accepts a minimal valid query', () => {
    const result = mobileHttpRequestsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing environment', () => {
    const result = mobileHttpRequestsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
      },
    });

    expectParseError(result);
  });
});

describe('mobileLocationStatsRoute params', () => {
  it('accepts a minimal valid query', () => {
    const result = mobileLocationStatsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing start', () => {
    const result = mobileLocationStatsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        end: range.end,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseError(result);
  });
});

describe('mobileMainStatisticsRoute params', () => {
  it('accepts a query with the required field', () => {
    const result = mobileMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
        field: 'device.manufacturer',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing the required field', () => {
    const result = mobileMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseError(result);
  });
});

describe('mobileMostUsedChartsRoute params', () => {
  it('accepts a query without the optional transactionType', () => {
    const result = mobileMostUsedChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing kuery', () => {
    const result = mobileMostUsedChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        environment: 'production',
      },
    });

    expectParseError(result);
  });
});

describe('mobileSessionsRoute params', () => {
  it('accepts a minimal valid query', () => {
    const result = mobileSessionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing end', () => {
    const result = mobileSessionsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        start: range.start,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseError(result);
  });
});

describe('mobileStatsRoute params', () => {
  it('accepts a minimal valid query', () => {
    const result = mobileStatsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing environment', () => {
    const result = mobileStatsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
      },
    });

    expectParseError(result);
  });
});

describe('mobileTermsByFieldRoute params', () => {
  it('accepts a query with size and fieldName, coercing size to a number', () => {
    const result = mobileTermsByFieldRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
        size: '10',
        fieldName: 'device.manufacturer',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing the required fieldName', () => {
    const result = mobileTermsByFieldRoute.params!.safeParse({
      path: { serviceName: 'opbeans-swift' },
      query: {
        ...range,
        kuery: '',
        environment: 'production',
        size: '10',
      },
    });

    expectParseError(result);
  });
});
