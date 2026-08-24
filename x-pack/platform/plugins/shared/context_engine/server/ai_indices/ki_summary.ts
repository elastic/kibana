/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import {
  groupKiTypeCountsForSummary,
  MAX_KI_TYPE_SUMMARY_COUNT,
} from '../../common/ki_type_counts';
import { KI_NOT_EXCLUDED_ESQL_PREDICATE } from '../../common/ki_lifecycle';
import type { KiTypeCount } from '../../common/http_api/ai_indices';
import { isEsqlUnknownColumnError } from '../esql_errors';

export interface KiSummary {
  count: number;
  countsByType: KiTypeCount[];
}

/**
 * @param excludeRemoved when true, skips KIs flagged as excluded. Only valid against a destination
 * whose mapping includes `attributes`; see `getKiSummary` for the fallback.
 */
export const getKiCountByTypeQuery = (destValue: string, excludeRemoved = true): string =>
  [
    `FROM ${destValue}`,
    ...(excludeRemoved ? [`WHERE ${KI_NOT_EXCLUDED_ESQL_PREDICATE}`] : []),
    'STATS count = COUNT(*) BY type',
    'INLINE STATS total = SUM(count)',
    'SORT count DESC',
    `LIMIT ${MAX_KI_TYPE_SUMMARY_COUNT}`,
  ].join(' | ');

const parseKiCountByTypeResponse = (response: {
  columns: Array<{ name: string }>;
  values?: unknown[][];
}): KiSummary => {
  const typeColumnIndex = response.columns.findIndex((column) => column.name === 'type');
  const countColumnIndex = response.columns.findIndex((column) => column.name === 'count');
  const totalColumnIndex = response.columns.findIndex((column) => column.name === 'total');

  if (typeColumnIndex === -1 || countColumnIndex === -1) {
    return { count: 0, countsByType: [] };
  }

  const values = response.values ?? [];
  if (values.length === 0) {
    return { count: 0, countsByType: [] };
  }

  const countsByType = values.flatMap((row) => {
    const type = row[typeColumnIndex];
    const count = row[countColumnIndex];
    if (typeof type !== 'string' || typeof count !== 'number') {
      return [];
    }
    return [{ type, count }];
  });

  const totalFromColumn = values[0][totalColumnIndex];
  const total =
    totalColumnIndex !== -1 && typeof totalFromColumn === 'number'
      ? totalFromColumn
      : countsByType.reduce((sum, item) => sum + item.count, 0);

  return { count: total, countsByType: groupKiTypeCountsForSummary(countsByType, total) };
};

/**
 * Counts the Knowledge Indicators an agent would actually retrieve, skipping any flagged as
 * excluded. A destination that does not map `attributes` (a strict-mapped AI index) makes ES|QL
 * reject the filter outright; such an index can never hold an excluded KI, so the unfiltered count
 * is the right answer there.
 */
export const getKiSummary = async (
  esClient: ElasticsearchClient,
  destValue: string
): Promise<KiSummary> => {
  const run = async (excludeRemoved: boolean) =>
    parseKiCountByTypeResponse(
      await esClient.esql.query({ query: getKiCountByTypeQuery(destValue, excludeRemoved) })
    );

  try {
    return await run(true);
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return { count: 0, countsByType: [] };
    }
    if (!isEsqlUnknownColumnError(error)) {
      throw error;
    }
  }

  try {
    return await run(false);
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return { count: 0, countsByType: [] };
    }
    throw error;
  }
};
