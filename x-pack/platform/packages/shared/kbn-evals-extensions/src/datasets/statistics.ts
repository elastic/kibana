/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { DatasetStats, DatasetVersion } from '../types';
import { computeSplitStats } from './splits';

/**
 * Computes summary statistics for a dataset.
 */
export const computeDatasetStats = (
  examples: Example[],
  versions: DatasetVersion[],
  splits?: Record<string, Example[]>
): DatasetStats => {
  const timestamps = versions.map((v) => new Date(v.timestamp).getTime());
  const createdAt =
    timestamps.length > 0
      ? new Date(Math.min(...timestamps)).toISOString()
      : new Date().toISOString();
  const updatedAt =
    timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : new Date().toISOString();

  // Collect tags across all versions
  const tags: Record<string, string> = {};
  for (const version of versions) {
    if (version.tag) {
      tags[version.tag] = version.timestamp;
    }
  }

  return {
    totalExamples: examples.length,
    splits: splits ? computeSplitStats(splits) : [],
    createdAt,
    updatedAt,
    versionCount: versions.length,
    tags,
  };
};
