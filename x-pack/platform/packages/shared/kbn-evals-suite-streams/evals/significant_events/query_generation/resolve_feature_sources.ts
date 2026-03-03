/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const resolveFeatureSourcesToRun = (
  source: string | undefined
): Array<'auto' | 'canonical' | 'snapshot'> => {
  // Default to running both variants so results are directly comparable
  if (source == null || source === 'both') {
    return ['canonical', 'snapshot'];
  }

  if (source === 'canonical' || source === 'snapshot' || source === 'auto') {
    return [source];
  }

  return ['auto'];
};

export const FEATURE_SOURCES_TO_RUN = resolveFeatureSourcesToRun(
  process.env.SIGEVENTS_QUERYGEN_FEATURES_SOURCE
);
