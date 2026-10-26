/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { SECONDS_UNIT, STATS_COLUMN } from '../constants';
import { groupById, numberOrNull, type EsqlRow } from './esql_rows';
import { toItemRate, toValue } from './stats_values';

export const noProcessorStats = (): StreamsUnit.StatsProcessorResult => ({ instances: [] });

/**
 * One instance of a processor from a row of the processor query. A column that ES|QL returned as
 * null stays no data. Processor failures are not queried yet, see `buildProcessorSumsQuery`, so
 * there is no failed rate column and that rate stays no data.
 */
const toInstance = (row: EsqlRow): StreamsUnit.StatsProcessorInstance => ({
  pipeline_id: String(row[STATS_COLUMN.pipeline]),
  route_index: numberOrNull(row[STATS_COLUMN.routeIndex]),
  processing_duration: {
    average: toValue(numberOrNull(row[STATS_COLUMN.avgDurationPerItem]), SECONDS_UNIT),
  },
  events: {
    incoming: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.incomingRate])) },
    failed: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.failedRate])) },
  },
});

/**
 * Places the rows of the processor query, one per processor instance, into the result of each
 * processor that has rows, in row order.
 */
export const mapProcessorStatsRows = ({
  rows,
}: {
  rows: EsqlRow[];
}): Record<string, StreamsUnit.StatsProcessorResult> =>
  Object.fromEntries(
    Object.entries(groupById(rows, STATS_COLUMN.step)).map(([id, instanceRows]) => [
      id,
      { instances: instanceRows.map(toInstance) },
    ])
  );
