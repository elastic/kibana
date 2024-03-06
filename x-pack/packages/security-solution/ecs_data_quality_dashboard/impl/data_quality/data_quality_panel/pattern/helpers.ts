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
import { isEqual, orderBy } from 'lodash/fp';

import type { IndexSummaryTableItem } from '../summary_table/helpers';
import type {
  IlmPhase,
  IlmExplainPhaseCounts,
  DataQualityCheckResult,
  PatternRollup,
  SortConfig,
} from '../../types';
import { getDocsCount, getSizeInBytes } from '../../helpers';

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
  ilmExplainRecord: IlmExplainLifecycleLifecycleExplain | undefined,
  isILMAvailable: boolean
): IlmPhase | undefined => {
  if (ilmExplainRecord == null || !isILMAvailable) {
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
  isILMAvailable,
  pattern,
  patternDocsCount,
  results,
  sortByColumn,
  sortByDirection,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexNames: string[];
  isILMAvailable: boolean;
  pattern: string;
  patternDocsCount: number;
  results: Record<string, DataQualityCheckResult> | undefined;
  sortByColumn: string;
  sortByDirection: 'desc' | 'asc';
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): IndexSummaryTableItem[] => {
  const summaryTableItems = indexNames.map((indexName) => ({
    docsCount: getDocsCount({ stats, indexName }),
    incompatible: getIndexIncompatible({ indexName, results }),
    indexName,
    ilmPhase:
      isILMAvailable && ilmExplain != null
        ? getIlmPhase(ilmExplain[indexName], isILMAvailable)
        : undefined,
    pattern,
    patternDocsCount,
    sizeInBytes: getSizeInBytes({ stats, indexName }),
    checkedAt: results?.[indexName]?.checkedAt,
  }));

  return orderBy([sortByColumn], [sortByDirection], summaryTableItems);
};

export const shouldCreateIndexNames = ({
  ilmExplain,
  indexNames,
  isILMAvailable,
  newIndexNames,
  stats,
}: {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexNames: string[] | undefined;
  isILMAvailable: boolean;
  newIndexNames: string[];
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): boolean => {
  return (
    !isEqual(newIndexNames, indexNames) &&
    stats != null &&
    ((isILMAvailable && ilmExplain != null) || !isILMAvailable)
  );
};

export const shouldCreatePatternRollup = ({
  error,
  ilmExplain,
  isILMAvailable,
  newDocsCount,
  patternRollup,
  stats,
}: {
  error: string | null;
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  isILMAvailable: boolean;
  newDocsCount: number;
  patternRollup: PatternRollup | undefined;
  stats: Record<string, IndicesStatsIndicesStats> | null;
}): boolean => {
  if (patternRollup?.docsCount === newDocsCount) {
    return false;
  }

  const allDataLoaded: boolean =
    stats != null && ((isILMAvailable && ilmExplain != null) || !isILMAvailable);
  const errorOccurred: boolean = error != null;

  return allDataLoaded || errorOccurred;
};

export const getIndexPropertiesContainerId = ({
  indexName,
  pattern,
}: {
  indexName: string;
  pattern: string;
}): string => `index-properties-container-${pattern}${indexName}`;

export const defaultSort: SortConfig = {
  sort: {
    direction: 'desc',
    field: 'docsCount',
  },
};

export const MIN_PAGE_SIZE = 10;

export const getPageIndex = ({
  indexName,
  items,
  pageSize,
}: {
  indexName: string;
  items: IndexSummaryTableItem[];
  pageSize: number;
}): number | null => {
  const index = items.findIndex((x) => x.indexName === indexName);

  if (index !== -1 && pageSize !== 0) {
    return Math.floor(index / pageSize);
  } else {
    return null;
  }
};
