/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';

import { getIlmPhase } from '../../../../utils/get_ilm_phase';
import { getDocsCount, getSizeInBytes } from '../../../../utils/stats';
import { MeteringStatsIndex } from '../../../../types';

export const getPatternDocsCount = ({
  indexNames,
  stats,
}: {
  indexNames: string[];
  stats: Record<string, MeteringStatsIndex> | null;
}): number =>
  indexNames.reduce(
    (acc: number, indexName: string) => acc + getDocsCount({ stats, indexName }),
    0
  );

export const getPatternSizeInBytes = ({
  indexNames,
  stats,
}: {
  indexNames: string[];
  stats: Record<string, MeteringStatsIndex> | null;
}): number | undefined => {
  let sum;
  for (let i = 0; i < indexNames.length; i++) {
    const currentSizeInBytes = getSizeInBytes({ stats, indexName: indexNames[i] });
    if (currentSizeInBytes != null) {
      if (sum == null) {
        sum = 0;
      }
      sum += currentSizeInBytes;
    } else {
      return undefined;
    }
  }
  return sum;
};

const EMPTY_INDEX_NAMES: string[] = [];
export const getIndexNames = ({
  ilmExplain,
  ilmPhases,
  isILMAvailable,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  ilmPhases: string[];
  isILMAvailable: boolean;
  stats: Record<string, MeteringStatsIndex> | null;
}): string[] => {
  if (((isILMAvailable && ilmExplain != null) || !isILMAvailable) && stats != null) {
    const allIndexNames = Object.keys(stats);
    const filteredByIlmPhase = isILMAvailable
      ? allIndexNames.filter((indexName) =>
          ilmPhases.includes(getIlmPhase(ilmExplain?.[indexName], isILMAvailable) ?? '')
        )
      : allIndexNames;

    return filteredByIlmPhase;
  } else {
    return EMPTY_INDEX_NAMES;
  }
};
