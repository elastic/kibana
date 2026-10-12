/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalDataStreamFeature, ExperimentalIndexingFeature } from '../types';

export const EXPERIMENTAL_INDEXING_FEATURES: ExperimentalIndexingFeature[] = [
  'synthetic_source',
  'tsdb',
  'doc_value_only_numeric',
  'doc_value_only_other',
];

/**
 * Keeps only the indexing features Fleet knows about. The installation saved object tolerates
 * unknown feature keys, but the package policy response schema does not, so a key written by an
 * older build must not be copied from the installation into API responses.
 */
export function sanitizeExperimentalDataStreamFeatures(
  features: ExperimentalDataStreamFeature[] | undefined
): ExperimentalDataStreamFeature[] | undefined {
  if (!features) {
    return features;
  }

  return features.map((entry) => {
    const known: ExperimentalDataStreamFeature['features'] = {};
    for (const name of EXPERIMENTAL_INDEXING_FEATURES) {
      const value = entry.features?.[name];
      if (value !== undefined) {
        known[name] = value;
      }
    }
    return { data_stream: entry.data_stream, features: known };
  });
}
