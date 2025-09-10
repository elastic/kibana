/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPartitioningFieldNames } from './get_partitioning_field_names';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

describe('getPartitioningFieldNames', () => {
  const job = {
    analysis_config: {
      detectors: [
        {
          function: 'count',
          detector_description: 'count',
        },
        {
          function: 'count',
          partition_field_name: 'clientip',
          detector_description: 'Count by clientip',
        },
        {
          function: 'freq_rare',
          by_field_name: 'uri',
          over_field_name: 'clientip',
          detector_description: 'Freq rare URI',
        },
        {
          function: 'sum',
          field_name: 'bytes',
          by_field_name: 'uri',
          over_field_name: 'clientip',
          partition_field_name: 'method',
          detector_description: 'sum bytes',
        },
      ],
    },
  } as unknown as CombinedJob;

  test('returns empty array for a detector with no partitioning fields', () => {
    const resp = getPartitioningFieldNames(job, 0);
    expect(resp).toEqual([]);
  });

  test('returns expected array for a detector with a partition field', () => {
    const resp = getPartitioningFieldNames(job, 1);
    expect(resp).toEqual(['clientip']);
  });

  test('returns expected array for a detector with by and over fields', () => {
    const resp = getPartitioningFieldNames(job, 2);
    expect(resp).toEqual(['uri', 'clientip']);
  });

  test('returns expected array for a detector with partition, by and over fields', () => {
    const resp = getPartitioningFieldNames(job, 3);
    expect(resp).toEqual(['method', 'uri', 'clientip']);
  });
});
