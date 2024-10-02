/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datum, Key, ArrayNode } from '@elastic/charts';
import { euiThemeVars } from '@kbn/ui-theme';
import { orderBy } from 'lodash/fp';

import { getDocsCount, getSizeInBytes } from '../../../../helpers';
import { getIlmPhase } from '../../../pattern/helpers';
import { PatternRollup } from '../../../../types';

export interface LegendItem {
  color: string | null;
  ilmPhase: string | null;
  index: string | null;
  pattern: string;
  sizeInBytes: number | undefined;
  docsCount: number;
}

export interface FlattenedBucket {
  ilmPhase: string | undefined;
  incompatible: number | undefined;
  indexName: string | undefined;
  pattern: string;
  sizeInBytes: number | undefined;
  docsCount: number;
}

export const getPatternSizeInBytes = ({
  pattern,
  patternRollups,
}: {
  pattern: string;
  patternRollups: Record<string, PatternRollup>;
}): number | undefined => {
  if (patternRollups[pattern] != null) {
    return patternRollups[pattern].sizeInBytes;
  } else {
    return undefined;
  }
};

export const getPatternDocsCount = ({
  pattern,
  patternRollups,
}: {
  pattern: string;
  patternRollups: Record<string, PatternRollup>;
}): number => {
  if (patternRollups[pattern] != null) {
    return patternRollups[pattern].docsCount ?? 0;
  } else {
    return 0;
  }
};

export const getPatternLegendItem = ({
  pattern,
  patternRollups,
}: {
  pattern: string;
  patternRollups: Record<string, PatternRollup>;
}): LegendItem => ({
  color: null,
  ilmPhase: null,
  index: null,
  pattern,
  sizeInBytes: getPatternSizeInBytes({ pattern, patternRollups }),
  docsCount: getPatternDocsCount({ pattern, patternRollups }),
});

export const getLegendItemsForPattern = ({
  pattern,
  flattenedBuckets,
}: {
  pattern: string;
  flattenedBuckets: FlattenedBucket[];
}): LegendItem[] =>
  orderBy(
    ['sizeInBytes'],
    ['desc'],
    flattenedBuckets
      .filter((x) => x.pattern === pattern)
      .map((flattenedBucket) => ({
        color: getFillColor(flattenedBucket.incompatible),
        ilmPhase: flattenedBucket.ilmPhase ?? null,
        index: flattenedBucket.indexName ?? null,
        pattern: flattenedBucket.pattern,
        sizeInBytes: flattenedBucket.sizeInBytes,
        docsCount: flattenedBucket.docsCount,
      }))
  );

export const getLegendItems = ({
  patterns,
  flattenedBuckets,
  patternRollups,
}: {
  patterns: string[];
  flattenedBuckets: FlattenedBucket[];
  patternRollups: Record<string, PatternRollup>;
}): LegendItem[] =>
  patterns.reduce<LegendItem[]>(
    (acc, pattern) => [
      ...acc,
      getPatternLegendItem({ pattern, patternRollups }),
      ...getLegendItemsForPattern({ pattern, flattenedBuckets }),
    ],
    []
  );

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

const groupByRollup = (d: Datum) => d.pattern; // the treemap is grouped by this field

export const DEFAULT_INDEX_COLOR = euiThemeVars.euiColorPrimary;

export const getFillColor = (incompatible: number | undefined): string => {
  if (incompatible === 0) {
    return euiThemeVars.euiColorSuccess;
  } else if (incompatible != null && incompatible > 0) {
    return euiThemeVars.euiColorDanger;
  } else {
    return DEFAULT_INDEX_COLOR;
  }
};

export const getPathToFlattenedBucketMap = (
  flattenedBuckets: FlattenedBucket[]
): Record<string, FlattenedBucket | undefined> =>
  flattenedBuckets.reduce<Record<string, FlattenedBucket | undefined>>(
    (acc, { pattern, indexName, ...remaining }) => ({
      ...acc,
      [`${pattern}${indexName}`]: { pattern, indexName, ...remaining },
    }),
    {}
  );

/**
 * Extracts the first group name from the data representing the second group
 */
export const getGroupFromPath = (path: ArrayNode['path']): string | undefined => {
  const OFFSET_FROM_END = 2; // The offset from the end of the path array containing the group
  const groupIndex = path.length - OFFSET_FROM_END;
  return groupIndex > 0 ? path[groupIndex].value : undefined;
};

export const getLayersMultiDimensional = ({
  valueFormatter,
  layer0FillColor,
  pathToFlattenedBucketMap,
}: {
  valueFormatter: (value: number) => string;
  layer0FillColor: string;
  pathToFlattenedBucketMap: Record<string, FlattenedBucket | undefined>;
}) => {
  return [
    {
      fillLabel: {
        valueFormatter,
      },
      groupByRollup,
      nodeLabel: (ilmPhase: Datum) => ilmPhase,
      shape: {
        fillColor: layer0FillColor,
      },
    },
    {
      fillLabel: {
        valueFormatter,
      },
      groupByRollup: (d: Datum) => d.indexName,
      nodeLabel: (indexName: Datum) => indexName,
      shape: {
        fillColor: (indexName: Key, _sortIndex: number, node: Pick<ArrayNode, 'path'>) => {
          const pattern = getGroupFromPath(node.path) ?? '';
          const flattenedBucket = pathToFlattenedBucketMap[`${pattern}${indexName}`];

          return getFillColor(flattenedBucket?.incompatible);
        },
      },
    },
  ];
};
