/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexDocsCountFromRollup } from '../data_quality_panel/data_quality_summary/summary_actions/check_all/helpers';
import { getIlmPhase } from '../data_quality_panel/pattern/helpers';
import { getAllIncompatibleMarkdownComments } from '../data_quality_panel/tabs/incompatible_tab/helpers';
import {
  getSizeInBytes,
  getTotalPatternIncompatible,
  getTotalPatternIndicesChecked,
  getTotalPatternSameFamily,
} from '../helpers';
import type { IlmPhase, PartitionedFieldMetadata, PatternRollup } from '../types';

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

export const updateResultOnCheckCompleted = ({
  error,
  formatBytes,
  formatNumber,
  indexName,
  isILMAvailable,
  partitionedFieldMetadata,
  pattern,
  patternRollups,
}: {
  error: string | null;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  indexName: string;
  isILMAvailable: boolean;
  partitionedFieldMetadata: PartitionedFieldMetadata | null;
  pattern: string;
  patternRollups: Record<string, PatternRollup>;
}): Record<string, PatternRollup> => {
  const patternRollup: PatternRollup | undefined = patternRollups[pattern];

  if (patternRollup != null) {
    const ilmExplain = patternRollup.ilmExplain;

    const ilmPhase: IlmPhase | undefined =
      ilmExplain != null ? getIlmPhase(ilmExplain[indexName], isILMAvailable) : undefined;

    const docsCount = getIndexDocsCountFromRollup({
      indexName,
      patternRollup,
    });

    const patternDocsCount = patternRollup.docsCount ?? 0;

    const sizeInBytes = getSizeInBytes({ indexName, stats: patternRollup.stats });

    const markdownComments =
      partitionedFieldMetadata != null
        ? getAllIncompatibleMarkdownComments({
            docsCount,
            formatBytes,
            formatNumber,
            ilmPhase,
            indexName,
            isILMAvailable,
            partitionedFieldMetadata,
            patternDocsCount,
            sizeInBytes,
          })
        : [];

    const incompatible = partitionedFieldMetadata?.incompatible.length;
    const sameFamily = partitionedFieldMetadata?.sameFamily.length;
    const checkedAt = partitionedFieldMetadata ? Date.now() : undefined;

    return {
      ...patternRollups,
      [pattern]: {
        ...patternRollup,
        results: {
          ...(patternRollup.results ?? {}),
          [indexName]: {
            docsCount,
            error,
            ilmPhase,
            incompatible,
            indexName,
            markdownComments,
            pattern,
            sameFamily,
            checkedAt,
          },
        },
      },
    };
  } else {
    return patternRollups;
  }
};
