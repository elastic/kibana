/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import { formatTimeValue } from './format_time_value';

describe('formatTimeValue', () => {
  const timeOfWeekRecord: MlAnomalyRecordDoc = {
    job_id: 'gallery_time_of_week',
    result_type: 'record',
    probability: 0.012818,
    record_score: 53.55134,
    initial_record_score: 53,
    bucket_span: 900,
    detector_index: 0,
    is_interim: false,
    timestamp: 1530155700000,
    by_field_name: 'clientip',
    by_field_value: '65.55.215.39',
    function: 'time_of_week',
    function_description: 'time',
  };

  const timeOfDayRecord: MlAnomalyRecordDoc = {
    job_id: 'gallery_time_of_day',
    result_type: 'record',
    probability: 0.012818,
    record_score: 97.94245,
    initial_record_score: 97,
    bucket_span: 900,
    detector_index: 0,
    is_interim: false,
    timestamp: 1517472900000,
    by_field_name: 'clientip',
    by_field_value: '157.56.93.83',
    function: 'time_of_day',
    function_description: 'time',
  };

  test('formats time_of_week with an explicit timezone', () => {
    const result = formatTimeValue(359739, 'time_of_week', timeOfWeekRecord, 'US/Eastern');

    expect(result.formatted).toBe('Sun 23:55');
    expect(result.moment.format('Z')).toBe('-04:00');
  });

  test('formats time_of_week independently from the record time within the same week', () => {
    const result = formatTimeValue(
      359739,
      'time_of_week',
      { ...timeOfWeekRecord, timestamp: 1530198896789 },
      'US/Eastern'
    );

    expect(result.formatted).toBe('Sun 23:55');
    expect(result.moment.format('Z')).toBe('-04:00');
  });

  test('calculates time_of_day day offsets in UTC', () => {
    const result = formatTimeValue(90000, 'time_of_day', timeOfDayRecord, 'UTC');

    expect(result.formatted).toBe('01:00');
    expect(result.dayOffset).toBe(1);
    expect(result.moment.format('Z')).toBe('+00:00');
  });
});
