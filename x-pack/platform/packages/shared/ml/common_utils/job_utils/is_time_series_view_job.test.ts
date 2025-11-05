/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTimeSeriesViewJob } from './is_time_series_view_job';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

describe('isTimeSeriesViewJob', () => {
  test('returns true when job has a single detector with a metric function', () => {
    const job = {
      analysis_config: {
        detectors: [
          {
            function: 'high_count',
            partition_field_name: 'status',
            detector_description: 'High count status code',
          },
        ],
      },
    } as unknown as CombinedJob;

    expect(isTimeSeriesViewJob(job)).toBe(true);
  });

  test('returns true when job has at least one detector with a metric function', () => {
    const job = {
      analysis_config: {
        detectors: [
          {
            function: 'high_count',
            partition_field_name: 'status',
            detector_description: 'High count status code',
          },
          {
            function: 'freq_rare',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            detector_description: 'Freq rare URI',
          },
        ],
      },
    } as unknown as CombinedJob;

    expect(isTimeSeriesViewJob(job)).toBe(true);
  });

  test('returns false when job does not have at least one detector with a metric function', () => {
    const job = {
      analysis_config: {
        detectors: [
          {
            function: 'varp',
            by_field_name: 'responsetime',
            detector_description: 'Varp responsetime',
          },
          {
            function: 'freq_rare',
            by_field_name: 'uri',
            over_field_name: 'clientip',
            detector_description: 'Freq rare URI',
          },
        ],
      },
    } as unknown as CombinedJob;

    expect(isTimeSeriesViewJob(job)).toBe(false);
  });

  test('returns false when job has a single count by category detector', () => {
    const job = {
      analysis_config: {
        detectors: [
          {
            function: 'count',
            by_field_name: 'mlcategory',
            detector_description: 'Count by category',
          },
        ],
      },
    } as unknown as CombinedJob;

    expect(isTimeSeriesViewJob(job)).toBe(false);
  });
});
