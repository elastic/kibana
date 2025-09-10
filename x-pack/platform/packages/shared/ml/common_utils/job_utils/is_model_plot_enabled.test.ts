/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isModelPlotEnabled } from './is_model_plot_enabled';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

describe('isModelPlotEnabled', () => {
  test('returns true for a job in which model plot has been enabled', () => {
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
      model_plot_config: {
        enabled: true,
      },
    } as unknown as Job;

    expect(isModelPlotEnabled(job, 0)).toBe(true);
  });

  test('returns expected values for a job in which model plot has been enabled with terms', () => {
    const job = {
      analysis_config: {
        detectors: [
          {
            function: 'max',
            field_name: 'responsetime',
            partition_field_name: 'country',
            by_field_name: 'airline',
          },
        ],
      },
      model_plot_config: {
        enabled: true,
        terms: 'US,AAL',
      },
    } as unknown as Job;

    expect(
      isModelPlotEnabled(job, 0, [
        { fieldName: 'country', fieldValue: 'US' },
        { fieldName: 'airline', fieldValue: 'AAL' },
      ])
    ).toBe(true);
    expect(isModelPlotEnabled(job, 0, [{ fieldName: 'country', fieldValue: 'US' }])).toBe(false);
    expect(
      isModelPlotEnabled(job, 0, [
        { fieldName: 'country', fieldValue: 'GB' },
        { fieldName: 'airline', fieldValue: 'AAL' },
      ])
    ).toBe(false);
    expect(
      isModelPlotEnabled(job, 0, [
        { fieldName: 'country', fieldValue: 'JP' },
        { fieldName: 'airline', fieldValue: 'JAL' },
      ])
    ).toBe(false);
  });

  test('returns true for jobs in which model plot has not been enabled', () => {
    const job1 = {
      analysis_config: {
        detectors: [
          {
            function: 'high_count',
            partition_field_name: 'status',
            detector_description: 'High count status code',
          },
        ],
      },
      model_plot_config: {
        enabled: false,
      },
    } as unknown as CombinedJob;
    const job2 = {} as unknown as CombinedJob;

    expect(isModelPlotEnabled(job1, 0)).toBe(false);
    expect(isModelPlotEnabled(job2, 0)).toBe(false);
  });
});
