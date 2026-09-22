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
import type { KiTypeCount } from '../../common/http_api/ai_indices';

export interface KiSummary {
  count: number;
  countsByType: KiTypeCount[];
}

export const getKiCountByTypeQuery = (destValue: string): string =>
  `FROM ${destValue} | STATS count = COUNT(*) BY type | INLINE STATS total = SUM(count) | SORT count DESC | LIMIT ${MAX_KI_TYPE_SUMMARY_COUNT}`;

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

export const getKiSummary = async (
  esClient: ElasticsearchClient,
  destValue: string
): Promise<KiSummary> => {
  try {
    const response = await esClient.esql.query({
      query: getKiCountByTypeQuery(destValue),
    });
    return parseKiCountByTypeResponse(response);
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return { count: 0, countsByType: [] };
    }
    throw error;
  }
};
