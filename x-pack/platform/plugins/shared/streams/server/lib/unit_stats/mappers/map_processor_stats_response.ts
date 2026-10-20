/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { SECONDS_UNIT, STATS_COLUMN } from '../constants';
import { numberOrNull } from './esql_rows';
import type { ProcessorRow } from './join_processor_rows';
import { noRate, noValue, toItemRate, toValue } from './stats_values';

export const noProcessorStats = (): StreamsUnit.StatsProcessorResult => ({
  processing_duration: { average: noValue() },
  events: { incoming: { rate: noRate(), failures: { rate: noRate() } } },
});

/**
 * Places the joined rows of each processor into its result. A column that ES|QL returned as
 * null stays no data. Processor failures are not queried yet, see `buildProcessorRateQuery`, so
 * there is no failures column and that rate stays no data.
 */
export const mapProcessorStatsRows = ({
  rows,
}: {
  rows: Record<string, ProcessorRow>;
}): Record<string, StreamsUnit.StatsProcessorResult> =>
  Object.fromEntries(
    Object.entries(rows).map(([id, row]) => [
      id,
      {
        processing_duration: {
          average: toValue(numberOrNull(row[STATS_COLUMN.avgDurationPerItem]), SECONDS_UNIT),
        },
        events: {
          incoming: {
            rate: toItemRate(numberOrNull(row[STATS_COLUMN.incomingRate])),
            failures: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.failedRate])) },
          },
        },
      },
    ])
  );
