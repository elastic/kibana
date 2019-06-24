/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getScoreString = (score: number): string => {
  if (score < 1) {
    return '< 1';
  } else {
    return String(score.toFixed(0));
  }
};
