/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { AnalysisConfig } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlClient } from '../../lib/ml_client';
import { calculateModelMemoryLimitProvider } from './calculate_model_memory_limit';

const mockGetCardinalityOfFields = jest.fn();
const mockGetMaxBucketCardinalities = jest.fn();

jest.mock('../fields_service', () => ({
  fieldsServiceProvider: () => ({
    getCardinalityOfFields: mockGetCardinalityOfFields,
    getMaxBucketCardinalities: mockGetMaxBucketCardinalities,
  }),
}));

const mlClient = {
  info: jest.fn().mockResolvedValue({ limits: {} }),
  estimateModelMemory: jest.fn().mockResolvedValue({ model_memory_estimate: '12mb' }),
} as unknown as MlClient;

const calculate = (analysisConfig: AnalysisConfig) =>
  calculateModelMemoryLimitProvider({} as IScopedClusterClient, mlClient)(
    analysisConfig,
    'logs',
    { match_all: {} },
    'timestamp',
    0,
    1000
  );

describe('calculateModelMemoryLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCardinalityOfFields.mockResolvedValue({ host: 10 });
    mockGetMaxBucketCardinalities.mockResolvedValue({ status: 3 });
  });

  it('does not look up the cardinality of mlcategory', async () => {
    const result = await calculate({
      bucket_span: '15m',
      categorization_field_name: 'message',
      detectors: [
        { function: 'rare', by_field_name: 'mlcategory' },
        { function: 'count', partition_field_name: 'host' },
      ],
      influencers: ['mlcategory', 'status'],
    } as AnalysisConfig);

    expect(mockGetCardinalityOfFields.mock.calls[0][1]).toEqual(['host']);
    expect(mockGetMaxBucketCardinalities.mock.calls[0][1]).toEqual(['status']);
    expect(result.modelMemoryLimit).toBe('12MB');
  });

  it('makes no cardinality requests when mlcategory is the only split field', async () => {
    await calculate({
      bucket_span: '15m',
      categorization_field_name: 'message',
      detectors: [{ function: 'rare', by_field_name: 'mlcategory' }],
      influencers: ['mlcategory'],
    } as AnalysisConfig);

    expect(mockGetCardinalityOfFields).not.toHaveBeenCalled();
    expect(mockGetMaxBucketCardinalities).not.toHaveBeenCalled();
  });
});
