/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DestinationOrSource } from '../types';

export const getNetworkFromInfluencers = (
  influencers: Array<Record<string, string>>
): { ip: string; type: DestinationOrSource } | null => {
  const recordFound = influencers.find(influencer => {
    const influencerName = Object.keys(influencer)[0];
    if (influencerName === 'destination.ip' || influencerName === 'source.ip') {
      return true;
    } else {
      return false;
    }
  });
  if (recordFound != null) {
    const influencerName = Object.keys(recordFound)[0];
    if (influencerName === 'destination.ip' || influencerName === 'source.ip') {
      return { ip: Object.values(recordFound)[0], type: influencerName };
    } else {
      // default to destination.ip
      return { ip: Object.values(recordFound)[0], type: 'destination.ip' };
    }
  } else {
    return null;
  }
};
