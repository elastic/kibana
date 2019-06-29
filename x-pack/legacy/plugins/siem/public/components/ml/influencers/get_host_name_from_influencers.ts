/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getHostNameFromInfluencers = (
  influencers: Array<Record<string, string>>
): string | null => {
  const recordFound = influencers.find(influencer => {
    const influencerName = Object.keys(influencer)[0];
    if (influencerName === 'host.name') {
      return true;
    } else {
      return false;
    }
  });
  if (recordFound != null) {
    return Object.values(recordFound)[0];
  } else {
    return null;
  }
};
