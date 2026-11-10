/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { pickInterval } from '../../common/histogram_interval';
import type { FieldValue, Filter, HistogramResponse } from '../../common/types';
import { runEsql } from './esql';
import { buildFilteredSource, quoteIdentifier } from './esql_builder';
import { getFields, toFieldTypeMap } from './fields';

const TIME_FIELD = '@timestamp';
const TIME_TYPES = new Set(['date', 'date_nanos']);
function toMillis(value: FieldValue | undefined): number | undefined {
  const millis = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isNaN(millis) ? undefined : millis;
}

/** Counts matching documents over `@timestamp` with ES|QL, for the index page chart. */
export async function getHistogram({
  esClient,
  index,
  filters,
  search,
}: {
  esClient: ElasticsearchClient;
  index: string;
  filters: readonly Filter[];
  search?: string;
}): Promise<HistogramResponse> {
  const fields = await getFields(esClient, index);
  const timeType = fields.find(({ name }) => name === TIME_FIELD)?.type;
  if (!timeType || !TIME_TYPES.has(timeType)) {
    return { buckets: [] };
  }

  const { base, params } = buildFilteredSource({
    index,
    filters,
    search,
    fieldTypes: toFieldTypeMap(fields),
  });
  const column = quoteIdentifier(TIME_FIELD);
  const range = await runEsql({
    esClient,
    body: { query: `${base}\n| STATS __min = MIN(${column}), __max = MAX(${column})`, params },
  });
  const [[minValue, maxValue] = []] = range.values;
  const min = toMillis(minValue);
  const max = toMillis(maxValue);
  if (min === undefined || max === undefined) {
    return { field: TIME_FIELD, buckets: [] };
  }

  const interval = pickInterval(max - min);
  const esql = {
    query: [
      base,
      `| STATS __count = COUNT(*) BY __bucket = BUCKET(${column}, ${interval.literal})`,
      '| SORT __bucket ASC',
    ].join('\n'),
    params,
  };
  const { columns, values } = await runEsql({ esClient, body: esql });
  const countPosition = columns.findIndex(({ name }) => name === '__count');
  const bucketPosition = columns.findIndex(({ name }) => name === '__bucket');
  const buckets = values.flatMap((row) => {
    const timestamp = toMillis(row[bucketPosition]);
    return timestamp === undefined ? [] : [{ timestamp, count: Number(row[countPosition]) }];
  });

  return { field: TIME_FIELD, intervalMs: interval.ms, buckets, esql };
}
