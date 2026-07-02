/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ChangeHistoryVersionMetadata {
  /** Optional consumer convention — not platform-defined. Used for `versionDistance` telemetry when present on both rows. */
  metadata?: {
    version?: number;
  };
}

/** Absolute difference between baseline and target `metadata.version` when both are numeric. */
export const computeChangeHistoryVersionDistance = (
  baseline: ChangeHistoryVersionMetadata,
  target: ChangeHistoryVersionMetadata
): number | undefined => {
  const baselineVersion = baseline.metadata?.version;
  const targetVersion = target.metadata?.version;

  if (typeof baselineVersion !== 'number' || typeof targetVersion !== 'number') {
    return undefined;
  }

  return Math.abs(targetVersion - baselineVersion);
};
