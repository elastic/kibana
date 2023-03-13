/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmExplainLifecycleLifecycleExplain,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import { sortBy } from 'lodash/fp';

import type { IndexSummaryTableItem } from '../summary_table/helpers';
import type {
  IlmPhase,
  IlmExplainPhaseCounts,
  DataQualityCheckResult,
  PatternRollup,
} from '../../types';
import { getDocsCount } from '../../helpers';

export const isManaged = (
  ilmExplainRecord: IlmExplainLifecycleLifecycleExplain | undefined
): boolean => ilmExplainRecord?.managed === true;

export const getPhaseCount = ({
  ilmExplain,
  ilmPhase,
  indexName,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  ilmPhase: IlmPhase;
  indexName: string;
}): number => {
  const ilmExplainRecord = ilmExplain != null ? ilmExplain[indexName] : undefined;

  if (ilmPhase === 'unmanaged') {
    return isManaged(ilmExplainRecord) ? 0 : 1;
  } else if (ilmExplainRecord != null && 'phase' in ilmExplainRecord) {
    return ilmExplainRecord.phase === ilmPhase ? 1 : 0;
  }

  return 0;
};

export const getIlmPhase = (
  ilmExplainRecord: IlmExplainLifecycleLifecycleExplain | undefined
): IlmPhase | undefined => {
  if (ilmExplainRecord == null) {
    return undefined;
  }

  if ('phase' in ilmExplainRecord) {
    const phase = ilmExplainRecord.phase;

    switch (phase) {
      case 'hot':
        return 'hot';
      case 'warm':
        return 'warm';
      case 'cold':
        return 'cold';
      case 'frozen':
        return 'frozen';
      default:
        return undefined;
    }
  } else {
    return 'unmanaged';
  }
};

export const getIlmExplainPhaseCounts = (
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null
): IlmExplainPhaseCounts => {
  const indexNames = ilmExplain != null ? Object.keys(ilmExplain) : [];

  return indexNames.reduce<IlmExplainPhaseCounts>(
    (acc, indexName) => ({
      hot:
        acc.hot +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'hot',
          indexName,
        }),
      warm:
        acc.warm +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'warm',
          indexName,
        }),
      cold:
        acc.cold +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'cold',
          indexName,
        }),
      frozen:
        acc.frozen +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'frozen',
          indexName,
        }),
      unmanaged:
        acc.unmanaged +
        getPhaseCount({
          ilmExplain,
          ilmPhase: 'unmanaged',
          indexName,
        }),
    }),
    {
      hot: 0,
      warm: 0,
      cold: 0,
      frozen: 0,
      unmanaged: 0,
    }
  );
};

export const getIndexIncompatible = ({
  indexName,
  results,
}: {
  indexName: string;
  results: Record<string, DataQualityCheckResult> | undefined;
}): number | undefined => {
  if (results == null || results[indexName] == null) {
    return undefined;
  }

  return results[indexName].incompatible;
};

export const getSummaryTableItems = ({
  ilmExplain,
  indexNames,
  pattern,
  patternDocsCount,
  results,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexNames: string[];
  pattern: string;
  patternDocsCount: number;
  results: Record<string, DataQualityCheckResult> | undefined;
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): IndexSummaryTableItem[] => {
  const summaryTableItems = indexNames.map((indexName) => ({
    docsCount: getDocsCount({ stats, indexName }),
    incompatible: getIndexIncompatible({ indexName, results }),
    indexName,
    ilmPhase: ilmExplain != null ? getIlmPhase(ilmExplain[indexName]) : undefined,
    pattern,
    patternDocsCount,
  }));

  return sortBy('docsCount', summaryTableItems).reverse();
};

export const getDefaultIndexIncompatibleCounts = (
  indexNames: string[]
): Record<string, number | undefined> =>
  indexNames.reduce<Record<string, number | undefined>>(
    (acc, indexName) => ({
      ...acc,
      [indexName]: undefined,
    }),
    {}
  );

export const createPatternIncompatibleEntries = ({
  indexNames,
  patternIncompatible,
}: {
  indexNames: string[];
  patternIncompatible: Record<string, number | undefined>;
}): Record<string, number | undefined> =>
  indexNames.reduce<Record<string, number | undefined>>(
    (acc, indexName) =>
      indexName in patternIncompatible
        ? { ...acc, [indexName]: patternIncompatible[indexName] }
        : { ...acc, [indexName]: undefined },
    {}
  );

export const getIncompatible = (
  patternIncompatible: Record<string, number | undefined>
): number | undefined => {
  const allIndexes = Object.values(patternIncompatible);
  const allIndexesHaveValues = allIndexes.every((incompatible) => Number.isInteger(incompatible));

  // only return a number when all indexes have an `incompatible` count:
  return allIndexesHaveValues
    ? allIndexes.reduce<number>((acc, incompatible) => acc + Number(incompatible), 0)
    : undefined;
};

export const shouldCreateIndexNames = ({
  ilmExplain,
  indexNames,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexNames: string[] | undefined;
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): boolean => indexNames == null && stats != null && ilmExplain != null;

export const shouldCreatePatternRollup = ({
  error,
  ilmExplain,
  patternRollup,
  stats,
}: {
  error: string | null;
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  patternRollup: PatternRollup | undefined;
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): boolean => {
  if (patternRollup != null) {
    return false; // the rollup already exists
  }

  const allDataLoaded: boolean = stats != null && ilmExplain != null;
  const errorOccurred: boolean = error != null;

  return allDataLoaded || errorOccurred;
};
