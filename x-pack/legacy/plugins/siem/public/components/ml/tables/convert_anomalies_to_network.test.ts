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
import { convertAnomaliesToNetwork } from './convert_anomalies_to_network';
import { AnomaliesByHost, AnomaliesByNetwork } from '../types';

describe('convert_anomalies_to_hosts', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it returns expected anomalies from a network if is part of the entityName and is a source.ip', () => {
    anomalies.anomalies[0].entityName = 'source.ip';
    anomalies.anomalies[0].entityValue = '127.0.0.1';
    const entities = convertAnomaliesToNetwork(anomalies);
    const expected: AnomaliesByNetwork[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'source.ip',
          entityValue: '127.0.0.1',
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
        ip: '127.0.0.1',
        type: 'source.ip',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns expected anomalies from a network if is part of the entityName and is a destination.ip', () => {
    anomalies.anomalies[0].entityName = 'destination.ip';
    anomalies.anomalies[0].entityValue = '127.0.0.1';
    const entities = convertAnomaliesToNetwork(anomalies);
    const expected: AnomaliesByNetwork[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'destination.ip',
          entityValue: '127.0.0.1',
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
        ip: '127.0.0.1',
        type: 'destination.ip',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns expected anomalies from a network if is part of the influencers and is a source.ip', () => {
    anomalies.anomalies[0].entityName = 'not-an-ip';
    anomalies.anomalies[0].entityValue = 'not-an-ip';
    anomalies.anomalies[0].influencers = [{ 'source.ip': '127.0.0.1' }];
    const entities = convertAnomaliesToNetwork(anomalies);
    const expected: AnomaliesByNetwork[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'not-an-ip',
          entityValue: 'not-an-ip',
          influencers: [{ 'source.ip': '127.0.0.1' }],
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
        ip: '127.0.0.1',
        type: 'source.ip',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns expected anomalies from a network if is part of the influencers and is a destination.ip', () => {
    anomalies.anomalies[0].entityName = 'not-an-ip';
    anomalies.anomalies[0].entityValue = 'not-an-ip';
    anomalies.anomalies[0].influencers = [{ 'destination.ip': '127.0.0.1' }];
    const entities = convertAnomaliesToNetwork(anomalies);
    const expected: AnomaliesByNetwork[] = [
      {
        anomaly: {
          detectorIndex: 0,
          entityName: 'not-an-ip',
          entityValue: 'not-an-ip',
          influencers: [{ 'destination.ip': '127.0.0.1' }],
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
        ip: '127.0.0.1',
        type: 'destination.ip',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns empty anomalies if sent in a null', () => {
    const entities = convertAnomaliesToNetwork(null);
    const expected: AnomaliesByHost[] = [];
    expect(entities).toEqual(expected);
  });
});
