/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTimeSeriesViewDetector } from './is_time_series_view_detector';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

describe('isTimeSeriesViewDetector', () => {
  const job = {
    analysis_config: {
      detectors: [
        {
          function: 'sum',
          field_name: 'bytes',
          partition_field_name: 'clientip',
          detector_description: 'High bytes client IP',
        },
        {
          function: 'freq_rare',
          by_field_name: 'uri',
          over_field_name: 'clientip',
          detector_description: 'Freq rare URI',
        },
        {
          function: 'count',
          by_field_name: 'mlcategory',
          detector_description: 'Count by category',
        },
        { function: 'count', by_field_name: 'hrd', detector_description: 'count by hrd' },
        { function: 'mean', field_name: 'NetworkDiff', detector_description: 'avg NetworkDiff' },
      ],
    },
    datafeed_config: {
      script_fields: {
        hrd: {
          script: {
            inline: 'return domainSplit(doc["query"].value, params).get(1);',
            lang: 'painless',
          },
        },
        NetworkDiff: {
          script: {
            source: 'doc["NetworkOut"].value - doc["NetworkIn"].value',
            lang: 'painless',
          },
        },
      },
    },
  } as unknown as CombinedJob;

  test('returns true for a detector with a metric function', () => {
    expect(isTimeSeriesViewDetector(job, 0)).toBe(true);
  });

  test('returns false for a detector with a non-metric function', () => {
    expect(isTimeSeriesViewDetector(job, 1)).toBe(false);
  });

  test('returns false for a detector using count on an mlcategory field', () => {
    expect(isTimeSeriesViewDetector(job, 2)).toBe(false);
  });

  test('returns false for a detector using a script field as a by field', () => {
    expect(isTimeSeriesViewDetector(job, 3)).toBe(false);
  });

  test('returns true for a detector using a script field as a metric field_name', () => {
    expect(isTimeSeriesViewDetector(job, 4)).toBe(true);
  });
});
