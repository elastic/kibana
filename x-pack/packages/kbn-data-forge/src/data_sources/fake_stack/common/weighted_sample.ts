/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times, sample } from 'lodash';

export const weightedSample = <F>(collection: Array<[F, number]>) => {
  const samples = collection.reduce((acc, row) => {
    const [item, weight] = row;
    return [...acc, ...times(weight).map(() => item)];
  }, [] as F[]);
  return sample(samples);
};
