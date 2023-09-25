/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { orderBy } from 'lodash/fp';

import { getDocsCount } from '../../../../helpers';
import type { IndexToCheck, PatternRollup } from '../../../../types';

const HIDDEN_PATTERNS = ['.', 'kibana_sample_data_'];

export const checkIsHiddenPattern = (pattern: string): boolean =>
  HIDDEN_PATTERNS.some((hiddenPattern) => pattern.startsWith(hiddenPattern));

const SKIPPED_INDICES = ['kibana_sample_data_', '.internal'];
export const checkIsSkippedIndex = (indexName: string): boolean =>
  SKIPPED_INDICES.some((skippedIndex) => indexName.startsWith(skippedIndex));

export const getIndexToCheck = ({
  indexName,
  pattern,
}: {
  indexName: string;
  pattern: string;
}): IndexToCheck => {
  const isHiddenPattern = checkIsHiddenPattern(pattern);
  const isSkippedIndex = checkIsSkippedIndex(indexName);
  return {
    pattern,
    indexName,
    isHiddenPattern,
    isSkippedIndex,
  };
};

export const getAllIndicesToCheck = (
  patternIndexNames: Record<string, string[]>
): IndexToCheck[] => {
  const allPatterns: string[] = Object.keys(patternIndexNames);

  // sort the patterns A-Z:
  const sortedPatterns = [...allPatterns].sort((a, b) => {
    return a.localeCompare(b);
  });

  // return all `IndexToCheck` sorted first by pattern A-Z:
  return sortedPatterns.reduce<IndexToCheck[]>((acc, pattern) => {
    const indexNames = patternIndexNames[pattern];
    const indicesToCheck = indexNames.map<IndexToCheck>((indexName) =>
      getIndexToCheck({ indexName, pattern })
    );

    const sortedIndicesToCheck = orderBy(['indexName'], ['desc'], indicesToCheck);

    return [...acc, ...sortedIndicesToCheck];
  }, []);
};

export const getIndexDocsCountFromRollup = ({
  indexName,
  patternRollup,
}: {
  indexName: string;
  patternRollup: PatternRollup;
}): number => {
  const stats: Record<string, IndicesStatsIndicesStats> | null = patternRollup?.stats ?? null;

  return getDocsCount({
    indexName,
    stats,
  });
};
