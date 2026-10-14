/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
import { metricsChartsRoute } from './metrics_charts';
import { serverlessActiveInstancesRoute } from './serverless_active_instances';
import { serverlessMetricsChartsRoute } from './serverless_charts';
import { serverlessFunctionsOverviewRoute } from './serverless_functions_overview';
import { serverlessSummaryRoute } from './serverless_summary';
import { serviceMetricsNodesRoute } from './service_nodes';

const range = {
  start: '2023-01-01T00:00:00.000Z',
  end: '2023-01-02T00:00:00.000Z',
};

describe('metricsChartsRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = metricsChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        agentName: 'java',
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional serviceNodeName', () => {
    const result = metricsChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        agentName: 'java',
        serviceNodeName: '_all',
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing agentName', () => {
    const result = metricsChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: {
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseError(result);
  });
});

describe('serverlessActiveInstancesRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serverlessActiveInstancesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional serverlessId', () => {
    const result = serverlessActiveInstancesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
        serverlessId: 'my-function',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing environment', () => {
    const result = serverlessActiveInstancesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        kuery: '',
        ...range,
      },
    });

    expectParseError(result);
  });
});

describe('serverlessMetricsChartsRoute params', () => {
  const validQuery = {
    environment: 'production',
    kuery: '',
    ...range,
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
    bucketSizeInSeconds: '60',
  };

  it('accepts a valid path and query, coercing bucketSizeInSeconds to a number', () => {
    const result = serverlessMetricsChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: validQuery,
    });

    expectParseSuccess(result);
    expect(result.data.query.bucketSizeInSeconds).toBe(60);
  });

  it('rejects an invalid documentType', () => {
    const result = serverlessMetricsChartsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: { ...validQuery, documentType: 'notADocumentType' },
    });

    expectParseError(result);
  });
});

describe('serverlessFunctionsOverviewRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serverlessFunctionsOverviewRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing range', () => {
    const result = serverlessFunctionsOverviewRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
      },
    });

    expectParseError(result);
  });
});

describe('serverlessSummaryRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serverlessSummaryRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('accepts an optional serverlessId', () => {
    const result = serverlessSummaryRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
        serverlessId: 'my-function',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing path', () => {
    const result = serverlessSummaryRoute.params!.safeParse({
      query: {
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseError(result);
  });
});

describe('serviceMetricsNodesRoute params', () => {
  it('accepts a valid path and query', () => {
    const result = serviceMetricsNodesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
        ...range,
      },
    });

    expectParseSuccess(result);
  });

  it('rejects an invalid start/end date', () => {
    const result = serviceMetricsNodesRoute.params!.safeParse({
      path: { serviceName: 'opbeans-node' },
      query: {
        environment: 'production',
        kuery: '',
        start: 'not-a-date',
        end: 'not-a-date',
      },
    });

    expectParseError(result);
  });
});
