/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomaly } from './types';

export const createEntitiesFromScore = (score: Anomaly): string => {
  const influencers = score.influencers.reduce((accum, item, index) => {
    if (index === 0) {
      return `${Object.keys(item)[0]}:'${Object.values(item)[0]}'`;
    } else {
      return `${accum},${Object.keys(item)[0]}:'${Object.values(item)[0]}'`;
    }
  }, '');

  if (!influencers.includes(score.entityName)) {
    return `${influencers},${score.entityName}:'${score.entityValue}'`;
  } else {
    return influencers;
  }
};
