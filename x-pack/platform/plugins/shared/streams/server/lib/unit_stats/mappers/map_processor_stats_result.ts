/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { SECONDS_UNIT, STATS_COLUMN } from '../constants';
import { indexById, numberOrNull, type EsqlRow } from './esql_rows';
import { toItemRate, toValue } from './stats_values';

export const noProcessorStats = (): StreamsUnit.StatsProcessorResult => ({
  processing_duration: { average: toValue(null, SECONDS_UNIT) },
  events: { incoming: { rate: toItemRate(null) }, failed: { rate: toItemRate(null) } },
});

/**
 * Places the rows of the processor query, one per processor, into the result of each processor
 * that has a row. A column that ES|QL returned as null stays no data. Processor failures are not
 * queried yet, see `buildProcessorSumsQuery`, so there is no failed rate column and that rate
 * stays no data.
 */
export const mapProcessorStatsRows = ({
  rows,
}: {
  rows: EsqlRow[];
}): Record<string, StreamsUnit.StatsProcessorResult> =>
  Object.fromEntries(
    Object.entries(indexById(rows, STATS_COLUMN.step)).map(([id, row]) => [
      id,
      {
        processing_duration: {
          average: toValue(numberOrNull(row[STATS_COLUMN.avgDurationPerItem]), SECONDS_UNIT),
        },
        events: {
          incoming: {
            rate: toItemRate(numberOrNull(row[STATS_COLUMN.incomingRate])),
          },
          failed: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.failedRate])) },
        },
      },
    ])
  );
