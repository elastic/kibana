/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';

export interface StatsRow {
  bucket: string | null;
  columns: Record<string, unknown>;
  groupEntries: Record<string, unknown>;
}

export const executeStatsEsqlRequest = async ({
  esClient,
  esqlRequest,
  logger,
  groupColumnNames,
}: {
  esClient: ElasticsearchClient;
  esqlRequest: { query: string; filter: estypes.QueryDslQueryContainer };
  logger: Logger;
  groupColumnNames?: string[];
}): Promise<StatsRow[]> => {
  try {
    const response = (await esClient.esql.query({
      query: esqlRequest.query,
      filter: esqlRequest.filter,
      drop_null_columns: true,
    })) as unknown as ESQLSearchResponse;

    const { columns, values } = response;

    if (columns.length === 0 || values.length === 0) {
      return [];
    }

    const bucketIndex = columns.findIndex(
      (col) => col.name === 'bucket' && col.type === 'date'
    );

    const groupColumnNameSet = groupColumnNames && groupColumnNames.length > 0
      ? new Set(groupColumnNames)
      : null;

    let groupColumnIndices: Array<{ idx: number; name: string }>;

    if (groupColumnNameSet) {
      groupColumnIndices = columns
        .map((col, idx) => ({ col, idx, name: col.name }))
        .filter(({ col, idx }) => idx !== bucketIndex && groupColumnNameSet.has(col.name))
        .map(({ idx, name }) => ({ idx, name }));
    } else {
      const aggregateColumnTypes = new Set([
        'long',
        'integer',
        'double',
        'unsigned_long',
        'counter_long',
        'counter_integer',
        'counter_double',
      ]);

      groupColumnIndices = columns
        .map((col, idx) => ({ col, idx, name: col.name }))
        .filter(({ col, idx }) => idx !== bucketIndex && !aggregateColumnTypes.has(col.type))
        .map(({ idx, name }) => ({ idx, name }));
    }

    groupColumnIndices.sort((a, b) => a.name.localeCompare(b.name));

    return values.map((row) => {
      const allColumns: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        allColumns[columns[i].name] = row[i];
      }

      const groupEntries: Record<string, unknown> = {};
      for (const { idx, name } of groupColumnIndices) {
        groupEntries[name] = row[idx];
      }

      return {
        bucket: bucketIndex !== -1 ? (row[bucketIndex] as string) : null,
        columns: allColumns,
        groupEntries,
      };
    });
  } catch (error) {
    const message = `Error executing STATS ES|QL request: ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.debug(message);
    throw createTaskRunError(new Error(message), TaskErrorSource.USER);
  }
};
