/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';

import { detectorToString } from './detector_to_string';

describe('detectorToString', () => {
  test('should return the correct descriptions for detectors', () => {
    const detector1: Detector = {
      function: 'count',
    };

    const detector2: Detector = {
      function: 'count',
      by_field_name: 'airline',
      use_null: false,
    };

    const detector3: Detector = {
      function: 'mean',
      field_name: 'CPUUtilization',
      partition_field_name: 'region',
      by_field_name: 'host',
      over_field_name: 'user',
      exclude_frequent: 'all',
    };

    expect(detectorToString(detector1)).toBe('count');
    expect(detectorToString(detector2)).toBe('count by airline use_null=false');
    expect(detectorToString(detector3)).toBe(
      'mean(CPUUtilization) by host over user partition_field_name=region exclude_frequent=all'
    );
  });
});
