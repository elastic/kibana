/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { createCompoundHostKey, createCompoundNetworkKey } from './create_compound_key';
import { AnomaliesByHost, AnomaliesByNetwork } from '../types';

describe('create_explorer_link', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it creates a compound host key', () => {
    const anomaliesByHost: AnomaliesByHost = {
      hostName: 'some-host-name',
      anomaly: anomalies.anomalies[0],
    };
    const key = createCompoundHostKey(anomaliesByHost);
    expect(key).toEqual('some-host-name-process.name-du-16.193669439507826-job-1');
  });

  test('it creates a compound network key', () => {
    const anomaliesByNetwork: AnomaliesByNetwork = {
      type: 'destination.ip',
      ip: '127.0.0.1',
      anomaly: anomalies.anomalies[0],
    };
    const key = createCompoundNetworkKey(anomaliesByNetwork);
    expect(key).toEqual('127.0.0.1-process.name-du-16.193669439507826-job-1');
  });
});
