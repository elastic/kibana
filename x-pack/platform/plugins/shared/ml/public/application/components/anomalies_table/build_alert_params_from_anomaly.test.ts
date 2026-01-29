/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomaliesTableRecord, MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils';
import { buildAlertParamsFromAnomaly } from './build_alert_params_from_anomaly';

const createMockAnomalySource = (
  overrides: Partial<MlAnomalyRecordDoc> = {}
): MlAnomalyRecordDoc => ({
  job_id: 'test-job',
  result_type: 'record',
  probability: 0.001,
  record_score: 75,
  initial_record_score: 75,
  bucket_span: 900,
  detector_index: 0,
  is_interim: false,
  timestamp: 1609459200000,
  function: 'mean',
  function_description: 'mean',
  ...overrides,
});

const createMockAnomaly = (
  overrides: Partial<MlAnomaliesTableRecord> = {},
  sourceOverrides: Partial<MlAnomalyRecordDoc> = {}
): MlAnomaliesTableRecord => ({
  time: 1609459200000,
  source: createMockAnomalySource(sourceOverrides),
  rowId: 'test-row-id',
  jobId: 'test-job',
  detectorIndex: 0,
  severity: 75,
  ...overrides,
});

describe('buildAlertParamsFromAnomaly', () => {
  describe('jobSelection', () => {
    test('includes the job ID from the anomaly', () => {
      const anomaly = createMockAnomaly({ jobId: 'my-anomaly-job' });
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.jobSelection).toEqual({ jobIds: ['my-anomaly-job'] });
    });
  });

  describe('severity', () => {
    test('sets severity 5 points below the anomaly severity', () => {
      const anomaly = createMockAnomaly({ severity: 75 });
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.severity).toBe(70);
    });

    test('floors the severity value', () => {
      const anomaly = createMockAnomaly({ severity: 75.9 });
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.severity).toBe(70);
    });

    test('does not go below 0', () => {
      const anomaly = createMockAnomaly({ severity: 3 });
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.severity).toBe(0);
    });
  });

  describe('resultType and includeInterim', () => {
    test('sets resultType to RECORD and includeInterim to false', () => {
      const anomaly = createMockAnomaly();
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.resultType).toBe(ML_ANOMALY_RESULT_TYPE.RECORD);
      expect(result.includeInterim).toBe(false);
    });
  });

  describe('kqlQueryString with entity fields', () => {
    test('returns null kqlQueryString when no entity fields or actual value', () => {
      const anomaly = createMockAnomaly({ actual: undefined }, {});
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBeNull();
    });

    test('includes partition field in KQL filter', () => {
      const anomaly = createMockAnomaly(
        { actual: undefined },
        {
          partition_field_name: 'host',
          partition_field_value: 'server-01',
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('host:server-01');
    });

    test('includes over field in KQL filter', () => {
      const anomaly = createMockAnomaly(
        { actual: undefined },
        {
          over_field_name: 'user',
          over_field_value: 'admin',
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('user:admin');
    });

    test('includes by field in KQL filter when no over field exists', () => {
      const anomaly = createMockAnomaly(
        { actual: undefined },
        {
          by_field_name: 'process',
          by_field_value: 'nginx',
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('process:nginx');
    });

    test('excludes by field when over field exists (population job behavior)', () => {
      const anomaly = createMockAnomaly(
        { actual: undefined },
        {
          over_field_name: 'user',
          over_field_value: 'admin',
          by_field_name: 'process',
          by_field_value: 'nginx',
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      // by field should be excluded when over field exists
      expect(result.kqlQueryString).toBe('user:admin');
      expect(result.kqlQueryString).not.toContain('process');
    });

    test('combines partition and over fields with AND', () => {
      const anomaly = createMockAnomaly(
        { actual: undefined },
        {
          partition_field_name: 'host',
          partition_field_value: 'server-01',
          over_field_name: 'user',
          over_field_value: 'admin',
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('host:server-01 and user:admin');
    });

    test('combines partition and by fields with AND when no over field', () => {
      const anomaly = createMockAnomaly(
        { actual: undefined },
        {
          partition_field_name: 'host',
          partition_field_value: 'server-01',
          by_field_name: 'process',
          by_field_value: 'nginx',
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('host:server-01 and process:nginx');
    });
  });

  describe('kqlQueryString with actual value', () => {
    test('includes actual value comparison for regular jobs', () => {
      const anomaly = createMockAnomaly({ actual: [100] }, {});
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('actual >= 100');
    });

    test('handles non-array actual value', () => {
      const anomaly = createMockAnomaly({}, {});
      // @ts-expect-error - testing non-array actual value
      anomaly.actual = 50;
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('actual >= 50');
    });

    test('uses nested causes syntax for population jobs', () => {
      const anomaly = createMockAnomaly(
        { actual: [100] },
        {
          causes: [
            {
              function: 'mean',
              function_description: 'mean',
              probability: 0.001,
              actual: [100],
              typical: [50],
            },
          ],
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('causes: {actual >= 100}');
    });

    test('does not include actual filter when actual is undefined', () => {
      const anomaly = createMockAnomaly({ actual: undefined }, {});
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBeNull();
    });

    test('does not include actual filter when actual array is empty', () => {
      const anomaly = createMockAnomaly({ actual: [] }, {});
      const result = buildAlertParamsFromAnomaly(anomaly);

      // actual[0] will be undefined, so no actual filter
      expect(result.kqlQueryString).toBeNull();
    });
  });

  describe('combined KQL filters', () => {
    test('combines entity fields and actual value with AND', () => {
      const anomaly = createMockAnomaly(
        { actual: [100] },
        {
          partition_field_name: 'host',
          partition_field_value: 'server-01',
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe('host:server-01 and actual >= 100');
    });

    test('builds complete KQL for complex anomaly', () => {
      const anomaly = createMockAnomaly(
        { actual: [250] },
        {
          partition_field_name: 'datacenter',
          partition_field_value: 'us-east-1',
          over_field_name: 'clientip',
          over_field_value: '192.168.1.1',
          causes: [
            {
              function: 'count',
              function_description: 'count',
              probability: 0.001,
              actual: [250],
              typical: [10],
            },
          ],
        }
      );
      const result = buildAlertParamsFromAnomaly(anomaly);

      expect(result.kqlQueryString).toBe(
        'datacenter:us-east-1 and clientip:192.168.1.1 and causes: {actual >= 250}'
      );
    });
  });
});
