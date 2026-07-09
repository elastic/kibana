/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { storageExplorerRoute } from './storage_explorer';
import { storageExplorerSummaryStatsRoute } from './storage_explorer_summary_stats';
import { storageExplorerGetServicesRoute } from './storage_explorer_get_services';
import { storageExplorerServiceDetailsRoute } from './storage_explorer_service_details';
import { storageChartRoute } from './storage_chart';

const validQueryWithProbability = {
  indexLifecyclePhase: 'all',
  probability: '1',
  environment: 'production',
  kuery: '',
  start: '2023-01-01T00:00:00.000Z',
  end: '2023-01-02T00:00:00.000Z',
};

const expectedParsedQuery = {
  indexLifecyclePhase: 'all',
  probability: 1,
  environment: 'production',
  kuery: '',
  start: new Date(validQueryWithProbability.start).getTime(),
  end: new Date(validQueryWithProbability.end).getTime(),
};

describe('storage_explorer route params', () => {
  it('storageExplorerRoute accepts a merged query with indexLifecyclePhase/probability/environment/kuery/range', () => {
    const result = storageExplorerRoute.params!.shape.query.safeParse(validQueryWithProbability);

    expectParseSuccess(result);
    expect(result.data).toEqual(expectedParsedQuery);
  });

  it('storageExplorerSummaryStatsRoute accepts the same merged query', () => {
    const result =
      storageExplorerSummaryStatsRoute.params!.shape.query.safeParse(validQueryWithProbability);

    expectParseSuccess(result);
    expect(result.data).toEqual(expectedParsedQuery);
  });

  it('storageChartRoute accepts the same merged query', () => {
    const result = storageChartRoute.params!.shape.query.safeParse(validQueryWithProbability);

    expectParseSuccess(result);
    expect(result.data).toEqual(expectedParsedQuery);
  });

  it('storageExplorerGetServicesRoute accepts a merged query without probability', () => {
    const { probability, ...queryWithoutProbability } = validQueryWithProbability;

    const result =
      storageExplorerGetServicesRoute.params!.shape.query.safeParse(queryWithoutProbability);

    expectParseSuccess(result);
  });

  it('storageExplorerServiceDetailsRoute validates both path and query', () => {
    const result = storageExplorerServiceDetailsRoute.params!.safeParse({
      path: { serviceName: 'opbeans-java' },
      query: validQueryWithProbability,
    });

    expectParseSuccess(result);
    expect(result.data.path).toEqual({ serviceName: 'opbeans-java' });
  });

  it('rejects an unknown indexLifecyclePhase', () => {
    const result = storageExplorerRoute.params!.shape.query.safeParse({
      ...validQueryWithProbability,
      indexLifecyclePhase: 'melting',
    });

    expectParseError(result);
  });

  it('rejects a missing required field', () => {
    const { environment, ...withoutEnvironment } = validQueryWithProbability;

    const result = storageExplorerRoute.params!.shape.query.safeParse(withoutEnvironment);

    expectParseError(result);
  });
});
