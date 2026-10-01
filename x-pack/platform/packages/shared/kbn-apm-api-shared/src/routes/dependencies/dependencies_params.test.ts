/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { dependencyErrorRateChartsRoute } from './error_rate_charts';
import { dependencyLatencyChartsRoute } from './latency_charts';
import { dependencyThroughputChartsRoute } from './throughput_charts';
import { dependencyLatencyDistributionRoute } from './latency_distribution';
import { dependencyMetadataRoute } from './metadata';
import { dependencyOperationsRoute } from './operations';
import { topDependenciesStatisticsRoute } from './top_dependencies_statistics';
import { topDependenciesRoute } from './top_dependencies';
import { topDependencySpansRoute } from './top_dependency_spans';
import { upstreamServicesRoute } from './upstream_services';

const validDependencyChartQuery = {
  dependencyName: 'postgresql',
  spanName: 'SELECT',
  searchServiceDestinationMetrics: 'true',
  start: '2021-01-01T00:00:00.000Z',
  end: '2021-01-08T00:00:00.000Z',
  kuery: '',
  environment: 'production',
};

describe('dependencyErrorRateChartsRoute params', () => {
  it('accepts a valid query', () => {
    const result = dependencyErrorRateChartsRoute.params!.safeParse({
      query: validDependencyChartQuery,
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing required fields', () => {
    const result = dependencyErrorRateChartsRoute.params!.safeParse({
      query: { dependencyName: 'postgresql' },
    });

    expectParseError(result);
  });
});

describe('dependencyLatencyChartsRoute params', () => {
  it('accepts a valid query', () => {
    const result = dependencyLatencyChartsRoute.params!.safeParse({
      query: validDependencyChartQuery,
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing required fields', () => {
    const result = dependencyLatencyChartsRoute.params!.safeParse({
      query: { spanName: 'SELECT' },
    });

    expectParseError(result);
  });
});

describe('dependencyThroughputChartsRoute params', () => {
  it('accepts a valid query', () => {
    const result = dependencyThroughputChartsRoute.params!.safeParse({
      query: validDependencyChartQuery,
    });

    expectParseSuccess(result);
  });

  it('rejects an entirely missing query', () => {
    const result = dependencyThroughputChartsRoute.params!.safeParse({});

    expectParseError(result);
  });
});

describe('dependencyLatencyDistributionRoute params', () => {
  it('accepts a valid query', () => {
    const result = dependencyLatencyDistributionRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        spanName: 'SELECT',
        percentileThreshold: '95',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a non-numeric percentileThreshold', () => {
    const result = dependencyLatencyDistributionRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        spanName: 'SELECT',
        percentileThreshold: 'not-a-number',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        kuery: '',
        environment: 'production',
      },
    });

    expectParseError(result);
  });
});

describe('dependencyMetadataRoute params', () => {
  it('accepts a valid query', () => {
    const result = dependencyMetadataRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing dependencyName', () => {
    const result = dependencyMetadataRoute.params!.safeParse({
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
      },
    });

    expectParseError(result);
  });
});

describe('dependencyOperationsRoute params', () => {
  it('accepts a valid query', () => {
    const result = dependencyOperationsRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        searchServiceDestinationMetrics: 'false',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        kuery: '',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a non-boolean searchServiceDestinationMetrics', () => {
    const result = dependencyOperationsRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        searchServiceDestinationMetrics: 'not-a-boolean',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        kuery: '',
        environment: 'production',
      },
    });

    expectParseError(result);
  });
});

describe('topDependenciesStatisticsRoute params', () => {
  it('accepts a valid query and body', () => {
    const result = topDependenciesStatisticsRoute.params!.safeParse({
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        numBuckets: '20',
      },
      body: { dependencyNames: JSON.stringify(['postgresql', 'redis']) },
    });

    expectParseSuccess(result);
  });

  it('rejects a body with an invalid JSON string', () => {
    const result = topDependenciesStatisticsRoute.params!.safeParse({
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        numBuckets: '20',
      },
      body: { dependencyNames: 'not-json' },
    });

    expectParseError(result);
  });

  it('rejects a body whose parsed JSON is not an array of strings', () => {
    const result = topDependenciesStatisticsRoute.params!.safeParse({
      query: {
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        numBuckets: '20',
      },
      body: { dependencyNames: JSON.stringify([1, 2, 3]) },
    });

    expectParseError(result);
  });
});

describe('topDependenciesRoute params', () => {
  it('accepts a valid query', () => {
    const result = topDependenciesRoute.params!.safeParse({
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        environment: 'production',
        kuery: '',
        numBuckets: '20',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing numBuckets', () => {
    const result = topDependenciesRoute.params!.safeParse({
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        environment: 'production',
        kuery: '',
      },
    });

    expectParseError(result);
  });
});

describe('topDependencySpansRoute params', () => {
  it('accepts a valid query without the optional sample range', () => {
    const result = topDependencySpansRoute.params!.safeParse({
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        environment: 'production',
        kuery: '',
        dependencyName: 'postgresql',
        spanName: 'SELECT',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts a valid query with the optional sample range', () => {
    const result = topDependencySpansRoute.params!.safeParse({
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        environment: 'production',
        kuery: '',
        dependencyName: 'postgresql',
        spanName: 'SELECT',
        sampleRangeFrom: '0',
        sampleRangeTo: '100',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing spanName', () => {
    const result = topDependencySpansRoute.params!.safeParse({
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        environment: 'production',
        kuery: '',
        dependencyName: 'postgresql',
      },
    });

    expectParseError(result);
  });
});

describe('upstreamServicesRoute params', () => {
  it('rejects a query missing the required environment/kuery fields', () => {
    const result = upstreamServicesRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        numBuckets: '20',
      },
    });

    expectParseError(result);
  });

  it('accepts a query without the optional offset field', () => {
    const result = upstreamServicesRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        numBuckets: '20',
        environment: 'production',
        kuery: '',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts a query with the optional environment/offset/kuery fields', () => {
    const result = upstreamServicesRoute.params!.safeParse({
      query: {
        dependencyName: 'postgresql',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        numBuckets: '20',
        environment: 'production',
        offset: '1d',
        kuery: '',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing dependencyName', () => {
    const result = upstreamServicesRoute.params!.safeParse({
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-08T00:00:00.000Z',
        numBuckets: '20',
      },
    });

    expectParseError(result);
  });
});
