/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllIncompatibleMarkdownComments } from '../../../data_quality_details/indices_details/pattern/index_check_flyout/index_properties/index_check_fields/tabs/incompatible_tab/helpers';
import { getSizeInBytes } from '../../../utils/stats';
import type { IlmPhase, PartitionedFieldMetadata, PatternRollup } from '../../../types';
import { getIndexDocsCountFromRollup } from './stats';
import { getIlmPhase } from '../../../utils/get_ilm_phase';

export const getPatternRollupsWithLatestCheckResult = ({
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
