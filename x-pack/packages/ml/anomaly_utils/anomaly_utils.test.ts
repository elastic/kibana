/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomalyRecordDoc } from './types';

import {
  aggregationTypeTransform,
  getEntityFieldList,
  getEntityFieldName,
  getEntityFieldValue,
  getSeverityWithLow,
  isRuleSupported,
  showActualForFunction,
  showTypicalForFunction,
  isMultiBucketAnomaly,
} from './anomaly_utils';

describe('ML - anomaly utils', () => {
  const partitionEntityRecord: MlAnomalyRecordDoc = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 0.012818,
    record_score: 0.0162059,
    initial_record_score: 0.0162059,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1455047400000,
    partition_field_name: 'airline',
    partition_field_value: 'AAL',
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const byEntityRecord: MlAnomalyRecordDoc = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 0.012818,
    record_score: 0.0162059,
    initial_record_score: 0.0162059,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1455047400000,
    by_field_name: 'airline',
    by_field_value: 'JZA',
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const overEntityRecord: MlAnomalyRecordDoc = {
    job_id: 'gallery',
    result_type: 'record',
    probability: 2.81806e-9,
    record_score: 59.055,
    initial_record_score: 59.055,
    bucket_span: 3600,
    detector_index: 4,
    is_interim: false,
    timestamp: 1420552800000,
    function: 'sum',
    function_description: 'sum',
    field_name: 'bytes',
    by_field_name: 'method',
    over_field_name: 'clientip',
    over_field_value: '37.157.32.164',
  };

  const noEntityRecord: MlAnomalyRecordDoc = {
    job_id: 'farequote_no_by',
    result_type: 'record',
    probability: 0.0191711,
    record_score: 4.38431,
    initial_record_score: 19.654,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1454890500000,
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const metricNoEntityRecord: MlAnomalyRecordDoc = {
    job_id: 'farequote_metric',
    result_type: 'record',
    probability: 0.030133495093182184,
    record_score: 0.024881740359975164,
    initial_record_score: 0.024881740359975164,
    bucket_span: 900,
    detector_index: 0,
    is_interim: false,
    timestamp: 1486845000000,
    function: 'metric',
    function_description: 'mean',
    typical: [545.7764658569108],
    actual: [758.8220213274412],
    field_name: 'responsetime',
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['NKS'],
      },
    ],
    airline: ['NKS'],
  };

  const rareEntityRecord: MlAnomalyRecordDoc = {
    job_id: 'gallery',
    result_type: 'record',
    probability: 0.02277014211908481,
    record_score: 4.545378107075983,
    initial_record_score: 4.545378107075983,
    bucket_span: 3600,
    detector_index: 0,
    is_interim: false,
    timestamp: 1495879200000,
    by_field_name: 'status',
    function: 'rare',
    function_description: 'rare',
    over_field_name: 'clientip',
    over_field_value: '173.252.74.112',
    causes: [
      {
        probability: 0.02277014211908481,
        by_field_name: 'status',
        by_field_value: '206',
        function: 'rare',
        function_description: 'rare',
        typical: [0.00014832458182211878],
        actual: [1],
        over_field_name: 'clientip',
        over_field_value: '173.252.74.112',
      },
    ],
    influencers: [
      {
        influencer_field_name: 'uri',
        influencer_field_values: [
          '/wp-content/uploads/2013/06/dune_house_oil_on_canvas_24x20-298x298.jpg',
          '/wp-content/uploads/2013/10/Case-dAste-1-11-298x298.png',
        ],
      },
      {
        influencer_field_name: 'status',
        influencer_field_values: ['206'],
      },
      {
        influencer_field_name: 'clientip',
        influencer_field_values: ['173.252.74.112'],
      },
    ],
    clientip: ['173.252.74.112'],
    uri: [
      '/wp-content/uploads/2013/06/dune_house_oil_on_canvas_24x20-298x298.jpg',
      '/wp-content/uploads/2013/10/Case-dAste-1-11-298x298.png',
    ],
    status: ['206'],
  };

  describe('getSeverityWithLow', () => {
    test('returns low for 0 <= score < 3', () => {
      expect(getSeverityWithLow(0).id).toBe('low');
      expect(getSeverityWithLow(0.001).id).toBe('low');
      expect(getSeverityWithLow(2.99).id).toBe('low');
    });

    test('returns warning for 3 <= score < 25', () => {
      expect(getSeverityWithLow(3).id).toBe('warning');
      expect(getSeverityWithLow(24.99).id).toBe('warning');
    });

    test('returns minor for 25 <= score < 50', () => {
      expect(getSeverityWithLow(25).id).toBe('minor');
      expect(getSeverityWithLow(49.99).id).toBe('minor');
    });

    test('returns minor for 50 <= score < 75', () => {
      expect(getSeverityWithLow(50).id).toBe('major');
      expect(getSeverityWithLow(74.99).id).toBe('major');
    });

    test('returns critical for score >= 75', () => {
      expect(getSeverityWithLow(75).id).toBe('critical');
      expect(getSeverityWithLow(100).id).toBe('critical');
      expect(getSeverityWithLow(1000).id).toBe('critical');
    });

    test('returns unknown for scores less than 0 ', () => {
      expect(getSeverityWithLow(-10).id).toBe('unknown');
    });
  });

  describe('isMultiBucketAnomaly', () => {
    const singleBucketAnomaly: MlAnomalyRecordDoc = {
      job_id: 'farequote_sb',
      result_type: 'record',
      probability: 0.0191711,
      record_score: 4.38431,
      initial_record_score: 19.654,
      bucket_span: 300,
      detector_index: 0,
      is_interim: false,
      timestamp: 1454890500000,
      function: 'mean',
      function_description: 'mean',
      field_name: 'responsetime',
      anomaly_score_explanation: {
        single_bucket_impact: 65,
        multi_bucket_impact: 14,
        lower_confidence_bound: 94.79879269994528,
        typical_value: 100.26620234643129,
        upper_confidence_bound: 106.04564690901603,
      },
    };

    const multiBucketAnomaly: MlAnomalyRecordDoc = {
      job_id: 'farequote_mb',
      result_type: 'record',
      probability: 0.0191711,
      record_score: 4.38431,
      initial_record_score: 19.654,
      bucket_span: 300,
      detector_index: 0,
      is_interim: false,
      timestamp: 1454890500000,
      function: 'mean',
      function_description: 'mean',
      field_name: 'responsetime',
      anomaly_score_explanation: {
        single_bucket_impact: 14,
        multi_bucket_impact: 65,
        lower_confidence_bound: 94.79879269994528,
        typical_value: 100.26620234643129,
        upper_confidence_bound: 106.04564690901603,
      },
    };

    const multiBucketAnomaly2: MlAnomalyRecordDoc = {
      job_id: 'farequote_mb2',
      result_type: 'record',
      probability: 0.0191711,
      record_score: 4.38431,
      initial_record_score: 19.654,
      bucket_span: 300,
      detector_index: 0,
      is_interim: false,
      timestamp: 1454890500000,
      function: 'mean',
      function_description: 'mean',
      field_name: 'responsetime',
      anomaly_score_explanation: {
        multi_bucket_impact: 65,
        lower_confidence_bound: 94.79879269994528,
        typical_value: 100.26620234643129,
        upper_confidence_bound: 106.04564690901603,
      },
    };

    const noASEAnomaly: MlAnomalyRecordDoc = {
      job_id: 'farequote_ase',
      result_type: 'record',
      probability: 0.0191711,
      record_score: 4.38431,
      initial_record_score: 19.654,
      bucket_span: 300,
      detector_index: 0,
      is_interim: false,
      timestamp: 1454890500000,
      function: 'mean',
      function_description: 'mean',
      field_name: 'responsetime',
    };

    const noMBIAnomaly: MlAnomalyRecordDoc = {
      job_id: 'farequote_sbi',
      result_type: 'record',
      probability: 0.0191711,
      record_score: 4.38431,
      initial_record_score: 19.654,
      bucket_span: 300,
      detector_index: 0,
      is_interim: false,
      timestamp: 1454890500000,
      function: 'mean',
      function_description: 'mean',
      field_name: 'responsetime',
      anomaly_score_explanation: {
        single_bucket_impact: 65,
        lower_confidence_bound: 94.79879269994528,
        typical_value: 100.26620234643129,
        upper_confidence_bound: 106.04564690901603,
      },
    };

    const singleBucketAnomaly2: MlAnomalyRecordDoc = {
      job_id: 'farequote_sb2',
      result_type: 'record',
      probability: 0.0191711,
      record_score: 4.38431,
      initial_record_score: 19.654,
      bucket_span: 300,
      detector_index: 0,
      is_interim: false,
      timestamp: 1454890500000,
      function: 'mean',
      function_description: 'mean',
      field_name: 'responsetime',
      anomaly_score_explanation: {
        single_bucket_impact: 65,
        multi_bucket_impact: 65,
        lower_confidence_bound: 94.79879269994528,
        typical_value: 100.26620234643129,
        upper_confidence_bound: 106.04564690901603,
      },
    };

    test('returns false when single_bucket_impact much larger than multi_bucket_impact', () => {
      expect(isMultiBucketAnomaly(singleBucketAnomaly)).toBe(false);
    });

    test('returns true when multi_bucket_impact much larger than single_bucket_impact', () => {
      expect(isMultiBucketAnomaly(multiBucketAnomaly)).toBe(true);
    });

    test('returns true when multi_bucket_impact > 0 and single_bucket_impact undefined', () => {
      expect(isMultiBucketAnomaly(multiBucketAnomaly2)).toBe(true);
    });

    test('returns false when anomaly_score_explanation undefined', () => {
      expect(isMultiBucketAnomaly(noASEAnomaly)).toBe(false);
    });

    test('returns false when multi_bucket_impact undefined', () => {
      expect(isMultiBucketAnomaly(noMBIAnomaly)).toBe(false);
    });

    test('returns false when multi_bucket_impact === single_bucket_impact', () => {
      expect(isMultiBucketAnomaly(singleBucketAnomaly2)).toBe(false);
    });
  });

  describe('getEntityFieldName', () => {
    it('returns the by field name', () => {
      expect(getEntityFieldName(byEntityRecord)).toBe('airline');
    });

    it('returns the partition field name', () => {
      expect(getEntityFieldName(partitionEntityRecord)).toBe('airline');
    });

    it('returns the over field name', () => {
      expect(getEntityFieldName(overEntityRecord)).toBe('clientip');
    });

    it('returns undefined if no by, over or partition fields', () => {
      expect(getEntityFieldName(noEntityRecord)).toBe(undefined);
    });
  });

  describe('getEntityFieldValue', () => {
    test('returns the by field value', () => {
      expect(getEntityFieldValue(byEntityRecord)).toBe('JZA');
    });

    test('returns the partition field value', () => {
      expect(getEntityFieldValue(partitionEntityRecord)).toBe('AAL');
    });

    test('returns the over field value', () => {
      expect(getEntityFieldValue(overEntityRecord)).toBe('37.157.32.164');
    });

    test('returns undefined if no by, over or partition fields', () => {
      expect(getEntityFieldValue(noEntityRecord)).toBe(undefined);
    });
  });

  describe('getEntityFieldList', () => {
    test('returns an empty list for a record with no by, over or partition fields', () => {
      expect(getEntityFieldList(noEntityRecord)).toHaveLength(0);
    });

    test('returns correct list for a record with a by field', () => {
      expect(getEntityFieldList(byEntityRecord)).toEqual([
        {
          fieldName: 'airline',
          fieldValue: 'JZA',
          fieldType: 'by',
        },
      ]);
    });

    test('returns correct list for a record with a partition field', () => {
      expect(getEntityFieldList(partitionEntityRecord)).toEqual([
        {
          fieldName: 'airline',
          fieldValue: 'AAL',
          fieldType: 'partition',
        },
      ]);
    });

    test('returns correct list for a record with an over field', () => {
      expect(getEntityFieldList(overEntityRecord)).toEqual([
        {
          fieldName: 'clientip',
          fieldValue: '37.157.32.164',
          fieldType: 'over',
        },
      ]);
    });

    test('returns correct list for a record with a by and over field', () => {
      expect(getEntityFieldList(rareEntityRecord)).toEqual([
        {
          fieldName: 'clientip',
          fieldValue: '173.252.74.112',
          fieldType: 'over',
        },
      ]);
    });
  });

  describe('showActualForFunction', () => {
    test('returns true for expected function descriptions', () => {
      expect(showActualForFunction('count')).toBe(true);
      expect(showActualForFunction('distinct_count')).toBe(true);
      expect(showActualForFunction('lat_long')).toBe(true);
      expect(showActualForFunction('mean')).toBe(true);
      expect(showActualForFunction('max')).toBe(true);
      expect(showActualForFunction('min')).toBe(true);
      expect(showActualForFunction('sum')).toBe(true);
      expect(showActualForFunction('median')).toBe(true);
      expect(showActualForFunction('varp')).toBe(true);
      expect(showActualForFunction('info_content')).toBe(true);
      expect(showActualForFunction('time')).toBe(true);
    });

    test('returns false for expected function descriptions', () => {
      expect(showActualForFunction('rare')).toBe(false);
    });
  });

  describe('showTypicalForFunction', () => {
    test('returns true for expected function descriptions', () => {
      expect(showTypicalForFunction('count')).toBe(true);
      expect(showTypicalForFunction('distinct_count')).toBe(true);
      expect(showTypicalForFunction('lat_long')).toBe(true);
      expect(showTypicalForFunction('mean')).toBe(true);
      expect(showTypicalForFunction('max')).toBe(true);
      expect(showTypicalForFunction('min')).toBe(true);
      expect(showTypicalForFunction('sum')).toBe(true);
      expect(showTypicalForFunction('median')).toBe(true);
      expect(showTypicalForFunction('varp')).toBe(true);
      expect(showTypicalForFunction('info_content')).toBe(true);
      expect(showTypicalForFunction('time')).toBe(true);
    });

    test('returns false for expected function descriptions', () => {
      expect(showTypicalForFunction('rare')).toBe(false);
    });
  });

  describe('isRuleSupported', () => {
    test('returns true for anomalies supporting rules', () => {
      expect(isRuleSupported(partitionEntityRecord)).toBe(true);
      expect(isRuleSupported(byEntityRecord)).toBe(true);
      expect(isRuleSupported(overEntityRecord)).toBe(true);
      expect(isRuleSupported(rareEntityRecord)).toBe(true);
      expect(isRuleSupported(noEntityRecord)).toBe(true);
    });

    it('returns false for anomaly not supporting rules', () => {
      expect(isRuleSupported(metricNoEntityRecord)).toBe(false);
    });
  });

  describe('aggregationTypeTransform', () => {
    test('returns correct ES aggregation type for ML function description', () => {
      expect(aggregationTypeTransform.toES('count')).toBe('count');
      expect(aggregationTypeTransform.toES('distinct_count')).toBe('cardinality');
      expect(aggregationTypeTransform.toES('mean')).toBe('avg');
      expect(aggregationTypeTransform.toES('max')).toBe('max');
      expect(aggregationTypeTransform.toES('min')).toBe('min');
      expect(aggregationTypeTransform.toES('sum')).toBe('sum');
    });

    test('returns correct ML function description for ES aggregation type', () => {
      expect(aggregationTypeTransform.toML('count')).toBe('count');
      expect(aggregationTypeTransform.toML('cardinality')).toBe('distinct_count');
      expect(aggregationTypeTransform.toML('avg')).toBe('mean');
      expect(aggregationTypeTransform.toML('max')).toBe('max');
      expect(aggregationTypeTransform.toML('min')).toBe('min');
      expect(aggregationTypeTransform.toML('sum')).toBe('sum');
    });
  });
});
