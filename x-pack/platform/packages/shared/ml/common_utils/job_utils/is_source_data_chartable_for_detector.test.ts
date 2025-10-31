/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSourceDataChartableForDetector } from './is_source_data_chartable_for_detector';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

describe('isSourceDataChartableForDetector', () => {
  const job = {
    analysis_config: {
      detectors: [
        { function: 'count' }, // 0
        { function: 'low_count' }, // 1
        { function: 'high_count' }, // 2
        { function: 'non_zero_count' }, // 3
        { function: 'low_non_zero_count' }, // 4
        { function: 'high_non_zero_count' }, // 5
        { function: 'distinct_count' }, // 6
        { function: 'low_distinct_count' }, // 7
        { function: 'high_distinct_count' }, // 8
        { function: 'metric' }, // 9
        { function: 'mean' }, // 10
        { function: 'low_mean' }, // 11
        { function: 'high_mean' }, // 12
        { function: 'median' }, // 13
        { function: 'low_median' }, // 14
        { function: 'high_median' }, // 15
        { function: 'min' }, // 16
        { function: 'max' }, // 17
        { function: 'sum' }, // 18
        { function: 'low_sum' }, // 19
        { function: 'high_sum' }, // 20
        { function: 'non_null_sum' }, // 21
        { function: 'low_non_null_sum' }, // 22
        { function: 'high_non_null_sum' }, // 23
        { function: 'rare' }, // 24
        { function: 'count', by_field_name: 'mlcategory' }, // 25
        { function: 'count', by_field_name: 'hrd' }, // 26
        { function: 'freq_rare' }, // 27
        { function: 'info_content' }, // 28
        { function: 'low_info_content' }, // 29
        { function: 'high_info_content' }, // 30
        { function: 'varp' }, // 31
        { function: 'low_varp' }, // 32
        { function: 'high_varp' }, // 33
        { function: 'time_of_day' }, // 34
        { function: 'time_of_week' }, // 35
        { function: 'lat_long' }, // 36
        { function: 'mean', field_name: 'NetworkDiff' }, // 37
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

  test('returns true for expected detectors', () => {
    expect(isSourceDataChartableForDetector(job, 0)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 1)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 2)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 3)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 4)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 5)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 6)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 7)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 8)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 9)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 10)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 11)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 12)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 13)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 14)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 15)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 16)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 17)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 18)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 19)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 20)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 21)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 22)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 23)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 24)).toBe(true);
    expect(isSourceDataChartableForDetector(job, 37)).toBe(true);
  });

  test('returns false for expected detectors', () => {
    expect(isSourceDataChartableForDetector(job, 25)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 26)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 27)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 28)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 29)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 30)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 31)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 32)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 33)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 34)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 35)).toBe(false);
    expect(isSourceDataChartableForDetector(job, 36)).toBe(false);
  });
});
