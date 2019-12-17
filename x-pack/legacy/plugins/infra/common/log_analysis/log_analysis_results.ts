/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ML_SEVERITY_SCORES = {
  warning: 3,
  minor: 25,
  major: 50,
  critical: 75,
};

export type MLSeverityScoreCategories = keyof typeof ML_SEVERITY_SCORES;

export const getSeverityCategoryForScore = (
  score: number
): MLSeverityScoreCategories | undefined => {
  if (score >= ML_SEVERITY_SCORES.critical) {
    return 'critical';
  } else if (score >= ML_SEVERITY_SCORES.major) {
    return 'major';
  } else if (score >= ML_SEVERITY_SCORES.minor) {
    return 'minor';
  } else if (score >= ML_SEVERITY_SCORES.warning) {
    return 'warning';
  } else {
    // Category is too low to include
    return undefined;
  }
};

export const formatAnomalyScore = (score: number) => {
  return Math.round(score);
};

export const getFriendlyNameForPartitionId = (partitionId: string) => {
  return partitionId !== '' ? partitionId : 'unknown';
};
