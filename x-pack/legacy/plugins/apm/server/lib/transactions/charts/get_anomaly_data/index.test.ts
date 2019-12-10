/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnomalySeries } from '.';
import { mlAnomalyResponse } from './mock-responses/mlAnomalyResponse';
import { mlBucketSpanResponse } from './mock-responses/mlBucketSpanResponse';
import { PromiseReturnType } from '../../../../../typings/common';
import { APMConfig } from '../../../../../../../../plugins/apm/server';

describe('getAnomalySeries', () => {
  let avgAnomalies: PromiseReturnType<typeof getAnomalySeries>;
  beforeEach(async () => {
    const clientSpy = jest
      .fn()
      .mockResolvedValueOnce(mlBucketSpanResponse)
      .mockResolvedValueOnce(mlAnomalyResponse);

    avgAnomalies = await getAnomalySeries({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      transactionName: undefined,
      timeSeriesDates: [100, 100000],
      setup: {
        start: 0,
        end: 500000,
        client: { search: clientSpy } as any,
        internalClient: { search: clientSpy } as any,
        config: new Proxy(
          {},
          {
            get: () => 'myIndex'
          }
        ) as APMConfig,
        uiFiltersES: [],
        indices: {
          'apm_oss.sourcemapIndices': 'myIndex',
          'apm_oss.errorIndices': 'myIndex',
          'apm_oss.onboardingIndices': 'myIndex',
          'apm_oss.spanIndices': 'myIndex',
          'apm_oss.transactionIndices': 'myIndex',
          'apm_oss.metricsIndices': 'myIndex',
          apmAgentConfigurationIndex: 'myIndex',
          apmServiceConnectionsIndex: 'myIndex'
        },
        dynamicIndexPattern: null as any
      }
    });
  });

  it('should remove buckets lower than threshold and outside date range from anomalyScore', () => {
    expect(avgAnomalies!.anomalyScore).toEqual([
      { x0: 15000, x: 25000 },
      { x0: 25000, x: 35000 }
    ]);
  });

  it('should remove buckets outside date range from anomalyBoundaries', () => {
    expect(
      avgAnomalies!.anomalyBoundaries!.filter(
        bucket => bucket.x < 100 || bucket.x > 100000
      ).length
    ).toBe(0);
  });

  it('should remove buckets with null from anomalyBoundaries', () => {
    expect(
      avgAnomalies!.anomalyBoundaries!.filter(p => p.y === null).length
    ).toBe(0);
  });

  it('should match snapshot', async () => {
    expect(avgAnomalies).toMatchSnapshot();
  });
});
