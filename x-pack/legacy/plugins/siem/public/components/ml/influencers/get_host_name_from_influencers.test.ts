/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { getHostNameFromInfluencers } from './get_host_name_from_influencers';
import { mockAnomalies } from '../mock';

describe('get_host_name_from_influencers', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('returns host names from influencers from the mock', () => {
    const hostName = getHostNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(hostName).toEqual('zeek-iowa');
  });

  test('returns null if there are no influencers from the mock', () => {
    anomalies.anomalies[0].influencers = [];
    const hostName = getHostNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(hostName).toEqual(null);
  });

  test('returns null if it is given undefined influencers', () => {
    const hostName = getHostNameFromInfluencers();
    expect(hostName).toEqual(null);
  });

  test('returns null if there influencers is an empty object', () => {
    anomalies.anomalies[0].influencers = [{}];
    const hostName = getHostNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(hostName).toEqual(null);
  });

  test('returns host name mixed with other data', () => {
    anomalies.anomalies[0].influencers = [{ 'host.name': 'name-1' }, { 'source.ip': '127.0.0.1' }];
    const hostName = getHostNameFromInfluencers(anomalies.anomalies[0].influencers);
    expect(hostName).toEqual('name-1');
  });
});
