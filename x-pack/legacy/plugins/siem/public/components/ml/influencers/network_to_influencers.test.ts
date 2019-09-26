/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfluencerInput } from '../types';
import { networkToInfluencers } from './network_to_influencers';

describe('network_to_influencers', () => {
  test('converts a network to an influencer', () => {
    const expectedInfluencer: InfluencerInput[] = [
      {
        fieldName: 'source.ip',
        fieldValue: '127.0.0.1',
      },
      {
        fieldName: 'destination.ip',
        fieldValue: '127.0.0.1',
      },
    ];
    expect(networkToInfluencers('127.0.0.1')).toEqual(expectedInfluencer);
  });
});
