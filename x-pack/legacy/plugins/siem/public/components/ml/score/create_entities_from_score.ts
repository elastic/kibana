/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomaly } from '../types';

export const createEntityFromRecord = (entity: Record<string, string>): string =>
  createEntity(Object.keys(entity)[0], Object.values(entity)[0]);

export const createEntity = (entityName: string, entityValue: string): string =>
  `${entityName}:'${entityValue}'`;

export const createInfluencersFromScore = (
  influencers: Array<Record<string, string>> = []
): string =>
  influencers.reduce((accum, item, index) => {
    if (index === 0) {
      return createEntityFromRecord(item);
    } else {
      return `${accum},${createEntityFromRecord(item)}`;
    }
  }, '');

export const createEntitiesFromScore = (score: Anomaly): string => {
  const influencers = createInfluencersFromScore(score.influencers);

  if (influencers.length === 0) {
    return createEntity(score.entityName, score.entityValue);
  } else if (!influencers.includes(score.entityName)) {
    return `${influencers},${createEntity(score.entityName, score.entityValue)}`;
  } else {
    return influencers;
  }
};
