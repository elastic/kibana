/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { serviceAgentRoute } from './service_agent';
import { serviceAlertsCountRoute } from './service_alerts_count';
import { serviceAnnotationsSearchRoute } from './service_annotations_search';
import { serviceAnomalyChartsRoute } from './service_anomaly_charts';
import { serviceAnomalyScoreRoute } from './service_anomaly_score';
import { serviceDependenciesBreakdownRoute } from './service_dependencies_breakdown';
import { serviceDependenciesRoute } from './service_dependencies';
import { serviceInstancesDetailedStatisticsRoute } from './service_instances_detailed_statistics';
import { serviceInstancesMainStatisticsRoute } from './service_instances_main_statistics';
import { serviceInstancesMetadataDetailsRoute } from './service_instances_metadata_details';

describe('serviceAgentRoute params', () => {
  it('accepts a valid path and range query', () => {
    const result = serviceAgentRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceName', () => {
    expectParseError(
      serviceAgentRoute.params!.safeParse({
        path: {},
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('serviceAlertsCountRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceAlertsCountRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing environment', () => {
    expectParseError(
      serviceAlertsCountRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});

describe('serviceAnnotationsSearchRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceAnnotationsSearchRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing range', () => {
    expectParseError(
      serviceAnnotationsSearchRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: { environment: 'production' },
      })
    );
  });
});

describe('serviceAnomalyChartsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceAnomalyChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
        transactionType: 'request',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing transactionType', () => {
    expectParseError(
      serviceAnomalyChartsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          environment: 'production',
        },
      })
    );
  });
});

describe('serviceAnomalyScoreRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceAnomalyScoreRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        environment: 'production',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing path', () => {
    expectParseError(
      serviceAnomalyScoreRoute.params!.safeParse({
        query: {
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
          environment: 'production',
        },
      })
    );
  });
});

describe('serviceDependenciesBreakdownRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceDependenciesBreakdownRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        kuery: '',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing kuery', () => {
    expectParseError(
      serviceDependenciesBreakdownRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('serviceDependenciesRoute params', () => {
  it('accepts a valid path and query, coercing numBuckets', () => {
    const result = serviceDependenciesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        numBuckets: '20',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional offset', () => {
    const result = serviceDependenciesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        numBuckets: '20',
        environment: 'production',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
        offset: '1d',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing numBuckets', () => {
    expectParseError(
      serviceDependenciesRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          environment: 'production',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('serviceInstancesDetailedStatisticsRoute params', () => {
  it('accepts a valid path and query, parsing serviceNodeIds JSON', () => {
    const result = serviceInstancesDetailedStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        latencyAggregationType: 'avg',
        transactionType: 'request',
        serviceNodeIds: JSON.stringify(['node-1', 'node-2']),
        numBuckets: '20',
        environment: 'production',
        kuery: '',
        start: '2021-01-01T00:00:00.000Z',
        end: '2021-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
    expect(result.data?.query.serviceNodeIds).toEqual(['node-1', 'node-2']);
  });

  it('rejects invalid JSON for serviceNodeIds', () => {
    expectParseError(
      serviceInstancesDetailedStatisticsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          latencyAggregationType: 'avg',
          transactionType: 'request',
          serviceNodeIds: '{not valid json',
          numBuckets: '20',
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });

  it('rejects an invalid latencyAggregationType', () => {
    expectParseError(
      serviceInstancesDetailedStatisticsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          latencyAggregationType: 'not-a-type',
          transactionType: 'request',
          serviceNodeIds: JSON.stringify(['node-1']),
          numBuckets: '20',
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('serviceInstancesMainStatisticsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceInstancesMainStatisticsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        latencyAggregationType: 'p95',
        transactionType: 'request',
        sortField: 'latency',
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
    expectParseError(
      serviceInstancesMainStatisticsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: {
          latencyAggregationType: 'p95',
          transactionType: 'request',
          sortField: 'latency',
          sortDirection: 'sideways',
          environment: 'production',
          kuery: '',
          start: '2021-01-01T00:00:00.000Z',
          end: '2021-01-02T00:00:00.000Z',
        },
      })
    );
  });
});

describe('serviceInstancesMetadataDetailsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceInstancesMetadataDetailsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java', serviceNodeName: 'node-1' },
      query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceNodeName', () => {
    expectParseError(
      serviceInstancesMetadataDetailsRoute.params!.safeParse({
        path: { serviceName: 'opbeans-java' },
        query: { start: '2021-01-01T00:00:00.000Z', end: '2021-01-02T00:00:00.000Z' },
      })
    );
  });
});
