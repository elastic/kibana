/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../../types';
import { getIlmPhase } from '../../../utils/get_ilm_phase';
import { getDocsCount, getSizeInBytes } from '../../../utils/stats';
import { FlattenedBucket } from '../types';

export const getFlattenedBuckets = ({
  ilmPhases,
  isILMAvailable,
  patternRollups,
}: {
  ilmPhases: string[];
  isILMAvailable: boolean;
  patternRollups: Record<string, PatternRollup>;
}): FlattenedBucket[] =>
  Object.values(patternRollups).reduce<FlattenedBucket[]>((acc, patternRollup) => {
    // enables fast lookup of valid phase names:
    const ilmPhasesMap = ilmPhases.reduce<Record<string, number>>(
      (phasesMap, phase) => ({ ...phasesMap, [phase]: 0 }),
      {}
    );
    const { ilmExplain, pattern, results, stats } = patternRollup;

    if (((isILMAvailable && ilmExplain != null) || !isILMAvailable) && stats != null) {
      return [
        ...acc,
        ...Object.entries(stats).reduce<FlattenedBucket[]>((validStats, [indexName]) => {
          const ilmPhase = getIlmPhase(ilmExplain?.[indexName], isILMAvailable);
          const isSelectedPhase =
            (isILMAvailable && ilmPhase != null && ilmPhasesMap[ilmPhase] != null) ||
            !isILMAvailable;

          if (isSelectedPhase) {
            const incompatible =
              results != null && results[indexName] != null
                ? results[indexName].incompatible
                : undefined;
            const sizeInBytes = getSizeInBytes({ indexName, stats });
            const docsCount = getDocsCount({ stats, indexName });
            return [
              ...validStats,
              {
                ilmPhase,
                incompatible,
                indexName,
                pattern,
                sizeInBytes,
                docsCount,
              },
            ];
          } else {
            return validStats;
          }
        }, []),
      ];
    }

    return acc;
  }, []);
