/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isModelPlotChartableForDetector } from './is_model_plot_chartable_for_detector';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';

describe('isModelPlotChartableForDetector', () => {
  const job1 = {
    analysis_config: {
      detectors: [{ function: 'count' }],
    },
  } as unknown as Job;

  const job2 = {
    analysis_config: {
      detectors: [
        { function: 'count' },
        { function: 'info_content' },
        {
          function: 'rare',
          by_field_name: 'mlcategory',
        },
      ],
    },
    model_plot_config: {
      enabled: true,
    },
  } as unknown as Job;

  test('returns false when model plot is not enabled', () => {
    expect(isModelPlotChartableForDetector(job1, 0)).toBe(false);
  });

  test('returns true for count detector when model plot is enabled', () => {
    expect(isModelPlotChartableForDetector(job2, 0)).toBe(true);
  });

  test('returns true for info_content detector when model plot is enabled', () => {
    expect(isModelPlotChartableForDetector(job2, 1)).toBe(true);
  });

  test('returns false for rare by mlcategory when model plot is enabled', () => {
    expect(isModelPlotChartableForDetector(job2, 2)).toBe(false);
  });
});
