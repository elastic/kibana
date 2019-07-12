/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfluencerInput } from '../types';
import { influencersOrCriteriaToString, getThreshold } from './use_anomalies_table_data';
import { AppKibanaFrameworkAdapter } from '../../../lib/adapters/framework/kibana_framework_adapter';

describe('use_anomalies_table_data', () => {
  test('should return a reduced single influencer to string', () => {
    const influencers: InfluencerInput[] = [
      {
        fieldName: 'field-1',
        fieldValue: 'value-1',
      },
    ];
    const influencerString = influencersOrCriteriaToString(influencers);
    expect(influencerString).toEqual('field-1:value-1');
  });

  test('should return a two single influencers together in a string', () => {
    const influencers: InfluencerInput[] = [
      {
        fieldName: 'field-1',
        fieldValue: 'value-1',
      },
      {
        fieldName: 'field-2',
        fieldValue: 'value-2',
      },
    ];
    const influencerString = influencersOrCriteriaToString(influencers);
    expect(influencerString).toEqual('field-1:value-1field-2:value-2');
  });

  test('should return an empty string when the array is empty', () => {
    const influencers: InfluencerInput[] = [];
    const influencerString = influencersOrCriteriaToString(influencers);
    expect(influencerString).toEqual('');
  });

  describe('#getThreshold', () => {
    test('should return 0 if given something below -1', () => {
      const config: Partial<AppKibanaFrameworkAdapter> = {
        anomalyScore: -100,
      };
      expect(getThreshold(config, -1)).toEqual(0);
    });

    test('should return 100 if given something above 100', () => {
      const config: Partial<AppKibanaFrameworkAdapter> = {
        anomalyScore: 1000,
      };
      expect(getThreshold(config, -1)).toEqual(100);
    });

    test('should return overridden value if passed in as non negative 1', () => {
      const config: Partial<AppKibanaFrameworkAdapter> = {
        anomalyScore: 75,
      };
      expect(getThreshold(config, 50)).toEqual(50);
    });

    test('should return 50 if no anomalyScore was set', () => {
      const config: Partial<AppKibanaFrameworkAdapter> = {};
      expect(getThreshold(config, -1)).toEqual(50);
    });

    test('should return custom setting', () => {
      const config: Partial<AppKibanaFrameworkAdapter> = {
        anomalyScore: 75,
      };
      expect(getThreshold(config, -1)).toEqual(75);
    });

    test('should round down a value up if sent in a floating point number', () => {
      const config: Partial<AppKibanaFrameworkAdapter> = {
        anomalyScore: 75.01,
      };
      expect(getThreshold(config, -1)).toEqual(75);
    });
  });
});
