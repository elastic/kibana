/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfluencerInput } from '../types';
import { influencersToString } from './use_anomalies_table_data';

describe('use_anomalies_table_data', () => {
  test('should return a reduced single influencer to string', () => {
    const influencers: InfluencerInput[] = [
      {
        fieldName: 'field-1',
        fieldValue: 'value-1',
      },
    ];
    const influencerString = influencersToString(influencers);
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
    const influencerString = influencersToString(influencers);
    expect(influencerString).toEqual('field-1:value-1field-2:value-2');
  });

  test('should return an empty string when the array is empty', () => {
    const influencers: InfluencerInput[] = [];
    const influencerString = influencersToString(influencers);
    expect(influencerString).toEqual('');
  });

  test('should return an empty string when passed null', () => {
    const influencerString = influencersToString(null);
    expect(influencerString).toEqual('');
  });
});
