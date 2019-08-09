/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { getTopSeverityJobs } from './get_top_severity';

describe('get_top_severity', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('gets the top severity jobs correctly on mock data', () => {
    const topJobs = getTopSeverityJobs(anomalies.anomalies);
    expect(topJobs).toEqual([
      {
        time: 1560664800000,
        source: {
          job_id: 'job-1',
          result_type: 'record',
          probability: 0.024041164411288146,
          multi_bucket_impact: 0,
          record_score: 16.193669439507826,
          initial_record_score: 16.193669439507826,
          bucket_span: 900,
          detector_index: 0,
          is_interim: false,
          timestamp: 1560664800000,
          by_field_name: 'process.name',
          by_field_value: 'du',
          partition_field_name: 'host.name',
          partition_field_value: 'zeek-iowa',
          function: 'rare',
          function_description: 'rare',
          typical: [0.024041164411288146],
          actual: [1],
          influencers: [
            {
              influencer_field_name: 'user.name',
              influencer_field_values: ['root'],
            },
            {
              influencer_field_name: 'process.name',
              influencer_field_values: ['du'],
            },
            {
              influencer_field_name: 'host.name',
              influencer_field_values: ['zeek-iowa'],
            },
          ],
        },
        rowId: '1561157194802_0',
        jobId: 'job-1',
        detectorIndex: 0,
        severity: 16.193669439507826,
        entityName: 'process.name',
        entityValue: 'du',
        influencers: [
          {
            'host.name': 'zeek-iowa',
          },
          {
            'process.name': 'du',
          },
          {
            'user.name': 'root',
          },
        ],
      },
      {
        time: 1560664800000,
        source: {
          job_id: 'job-2',
          result_type: 'record',
          probability: 0.024041164411288146,
          multi_bucket_impact: 0,
          record_score: 16.193669439507826,
          initial_record_score: 16.193669439507826,
          bucket_span: 900,
          detector_index: 0,
          is_interim: false,
          timestamp: 1560664800000,
          by_field_name: 'process.name',
          by_field_value: 'ls',
          partition_field_name: 'host.name',
          partition_field_value: 'zeek-iowa',
          function: 'rare',
          function_description: 'rare',
          typical: [0.024041164411288146],
          actual: [1],
          influencers: [
            {
              influencer_field_name: 'user.name',
              influencer_field_values: ['root'],
            },
            {
              influencer_field_name: 'process.name',
              influencer_field_values: ['ls'],
            },
            {
              influencer_field_name: 'host.name',
              influencer_field_values: ['zeek-iowa'],
            },
          ],
        },
        rowId: '1561157194802_1',
        jobId: 'job-2',
        detectorIndex: 0,
        severity: 16.193669439507826,
        entityName: 'process.name',
        entityValue: 'ls',
        influencers: [
          {
            'host.name': 'zeek-iowa',
          },
          {
            'process.name': 'ls',
          },
          {
            'user.name': 'root',
          },
        ],
      },
    ]);
  });

  test('gets the top severity jobs sorted by severity', () => {
    anomalies.anomalies[0].severity = 0;
    anomalies.anomalies[1].severity = 100;
    const topJobs = getTopSeverityJobs(anomalies.anomalies);
    expect(topJobs[0].severity).toEqual(100);
    expect(topJobs[1].severity).toEqual(0);
  });

  test('removes duplicate job Ids', () => {
    const anomaly = anomalies.anomalies[0];
    anomalies.anomalies = [
      cloneDeep(anomaly),
      cloneDeep(anomaly),
      cloneDeep(anomaly),
      cloneDeep(anomaly),
    ];
    const topJobs = getTopSeverityJobs(anomalies.anomalies);
    expect(topJobs.length).toEqual(1);
  });

  test('preserves multiple job Ids', () => {
    const anomaly = anomalies.anomalies[0];
    const anomaly1 = cloneDeep(anomaly);
    anomaly1.jobId = 'job-1';
    const anomaly2 = cloneDeep(anomaly);
    anomaly2.jobId = 'job-2';
    const anomaly3 = cloneDeep(anomaly);
    anomaly3.jobId = 'job-3';
    const anomaly4 = cloneDeep(anomaly);
    anomaly4.jobId = 'job-4';

    anomalies.anomalies = [anomaly1, anomaly2, anomaly3, anomaly4];
    const topJobs = getTopSeverityJobs(anomalies.anomalies);
    expect(topJobs.length).toEqual(4);
  });

  test('will choose a job id which has a higher score', () => {
    const anomaly = anomalies.anomalies[0];

    const anomaly1 = cloneDeep(anomaly);
    anomaly1.jobId = 'job-1';
    anomaly1.severity = 100;

    const anomaly2 = cloneDeep(anomaly);
    anomaly2.jobId = 'job-2';
    anomaly2.severity = 20; // This should not show since job-2 (25 below replaces this)

    const anomaly3 = cloneDeep(anomaly);
    anomaly3.jobId = 'job-3';
    anomaly3.severity = 30;

    const anomaly4 = cloneDeep(anomaly);
    anomaly4.jobId = 'job-4';
    anomaly4.severity = 10;

    const anomaly5 = cloneDeep(anomaly);
    anomaly5.jobId = 'job-2';
    anomaly5.severity = 25; // This will replace job-2 (20 above)

    anomalies.anomalies = [anomaly1, anomaly2, anomaly3, anomaly4, anomaly5];
    const topJobs = getTopSeverityJobs(anomalies.anomalies);
    expect(topJobs[0].severity).toEqual(100);
    expect(topJobs[1].severity).toEqual(30);
    expect(topJobs[2].severity).toEqual(25);
    expect(topJobs[3].severity).toEqual(10);
  });

  test('it returns a top severity of empty length with an empty array', () => {
    anomalies.anomalies = [];
    const topJobs = getTopSeverityJobs(anomalies.anomalies);
    expect(topJobs.length).toEqual(0);
  });
});
