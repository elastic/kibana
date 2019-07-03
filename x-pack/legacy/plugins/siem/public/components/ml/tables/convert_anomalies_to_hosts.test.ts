/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { convertAnomaliesToHosts } from './convert_anomalies_to_hosts';
import { AnomaliesByHost } from '../types';

describe('convert_anomalies_to_hosts', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it returns expected anomalies from a host', () => {
    const entities = convertAnomaliesToHosts(anomalies);
    const expected: AnomaliesByHost[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'process.name',
          entityValue: 'du',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'du' },
            { 'user.name': 'root' },
          ],
          jobId: 'job-1',
          rowId: '1561157194802_0',
          severity: 16.193669439507826,
          source: {
            actual: [1],
            bucket_span: 900,
            by_field_name: 'process.name',
            by_field_value: 'du',
            detector_index: 0,
            function: 'rare',
            function_description: 'rare',
            influencers: [
              { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
              { influencer_field_name: 'process.name', influencer_field_values: ['du'] },
              { influencer_field_name: 'host.name', influencer_field_values: ['zeek-iowa'] },
            ],
            initial_record_score: 16.193669439507826,
            is_interim: false,
            job_id: 'job-1',
            multi_bucket_impact: 0,
            partition_field_name: 'host.name',
            partition_field_value: 'zeek-iowa',
            probability: 0.024041164411288146,
            record_score: 16.193669439507826,
            result_type: 'record',
            timestamp: 1560664800000,
            typical: [0.024041164411288146],
          },
          time: 1560664800000,
        },
        hostName: 'zeek-iowa',
      },
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'process.name',
          entityValue: 'ls',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'ls' },
            { 'user.name': 'root' },
          ],
          jobId: 'job-2',
          rowId: '1561157194802_1',
          severity: 16.193669439507826,
          source: {
            actual: [1],
            bucket_span: 900,
            by_field_name: 'process.name',
            by_field_value: 'ls',
            detector_index: 0,
            function: 'rare',
            function_description: 'rare',
            influencers: [
              { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
              { influencer_field_name: 'process.name', influencer_field_values: ['ls'] },
              { influencer_field_name: 'host.name', influencer_field_values: ['zeek-iowa'] },
            ],
            initial_record_score: 16.193669439507826,
            is_interim: false,
            job_id: 'job-2',
            multi_bucket_impact: 0,
            partition_field_name: 'host.name',
            partition_field_value: 'zeek-iowa',
            probability: 0.024041164411288146,
            record_score: 16.193669439507826,
            result_type: 'record',
            timestamp: 1560664800000,
            typical: [0.024041164411288146],
          },
          time: 1560664800000,
        },
        hostName: 'zeek-iowa',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns empty anomalies if sent in a null', () => {
    const entities = convertAnomaliesToHosts(null);
    const expected: AnomaliesByHost[] = [];
    expect(entities).toEqual(expected);
  });
});
