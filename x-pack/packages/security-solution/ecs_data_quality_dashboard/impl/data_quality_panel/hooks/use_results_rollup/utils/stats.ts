/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataQualityCheckResult, MeteringStatsIndex, PatternRollup } from '../../../types';
import {
  getDocsCount,
  getTotalPatternIncompatible,
  getTotalPatternIndicesChecked,
} from '../../../utils/stats';

export const getTotalPatternSameFamily = (
  results: Record<string, DataQualityCheckResult> | undefined
): number | undefined => {
  if (results == null) {
    return undefined;
  }

  const allResults = Object.values(results);

  return allResults.reduce<number>((acc, { sameFamily }) => acc + (sameFamily ?? 0), 0);
};

export const getTotalIndices = (
  patternRollups: Record<string, PatternRollup>
): number | undefined => {
  const allRollups = Object.values(patternRollups);
  const allRollupsHaveIndices = allRollups.every(({ indices }) => Number.isInteger(indices));

  // only return the total when all `PatternRollup`s have a `indices`:
  return allRollupsHaveIndices
    ? allRollups.reduce((acc, { indices }) => acc + Number(indices), 0)
    : undefined;
};

export const getTotalDocsCount = (
  patternRollups: Record<string, PatternRollup>
): number | undefined => {
  const allRollups = Object.values(patternRollups);
  const allRollupsHaveDocsCount = allRollups.every(({ docsCount }) => Number.isInteger(docsCount));

  // only return the total when all `PatternRollup`s have a `docsCount`:
  return allRollupsHaveDocsCount
    ? allRollups.reduce((acc, { docsCount }) => acc + Number(docsCount), 0)
    : undefined;
};

export const getTotalSizeInBytes = (
  patternRollups: Record<string, PatternRollup>
): number | undefined => {
  const allRollups = Object.values(patternRollups);
  const allRollupsHaveSizeInBytes = allRollups.every(({ sizeInBytes }) =>
    Number.isInteger(sizeInBytes)
  );

  // only return the total when all `PatternRollup`s have a `sizeInBytes`:
  return allRollupsHaveSizeInBytes
    ? allRollups.reduce((acc, { sizeInBytes }) => acc + Number(sizeInBytes), 0)
    : undefined;
};

export const getTotalIncompatible = (
  patternRollups: Record<string, PatternRollup>
): number | undefined => {
  const allRollups = Object.values(patternRollups);
  const anyRollupsHaveResults = allRollups.some(({ results }) => results != null);

  // only return the total when at least one `PatternRollup` has results:
  return anyRollupsHaveResults
    ? allRollups.reduce((acc, { results }) => acc + (getTotalPatternIncompatible(results) ?? 0), 0)
    : undefined;
};

export const getTotalSameFamily = (
  patternRollups: Record<string, PatternRollup>
): number | undefined => {
  const allRollups = Object.values(patternRollups);
  const anyRollupsHaveResults = allRollups.some(({ results }) => results != null);

  // only return the total when at least one `PatternRollup` has results:
  return anyRollupsHaveResults
    ? allRollups.reduce((acc, { results }) => acc + (getTotalPatternSameFamily(results) ?? 0), 0)
    : undefined;
};

export const getTotalIndicesChecked = (patternRollups: Record<string, PatternRollup>): number => {
  const allRollups = Object.values(patternRollups);

  return allRollups.reduce(
    (acc, patternRollup) => acc + getTotalPatternIndicesChecked(patternRollup),
    0
  );
};

export const getIndexId = ({
  indexName,
  stats,
}: {
  indexName: string;
  stats: Record<string, MeteringStatsIndex> | null;
}): string | null | undefined => stats && stats[indexName]?.uuid;

export const getIndexDocsCountFromRollup = ({
  indexName,
  patternRollup,
}: {
  indexName: string;
  patternRollup: PatternRollup;
}): number => {
  const stats: Record<string, MeteringStatsIndex> | null = patternRollup?.stats ?? null;

  return getDocsCount({
    indexName,
    stats,
  });
};
