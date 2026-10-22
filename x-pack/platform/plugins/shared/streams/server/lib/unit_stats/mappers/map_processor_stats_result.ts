/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { SECONDS_UNIT, STATS_COLUMN } from '../constants';
import { indexById, numberOrNull, type EsqlRow, type EsqlValue } from './esql_rows';
import { toItemRate, toValue } from './stats_values';

export const noProcessorStats = (): StreamsUnit.StatsProcessorResult => ({
  processing_duration: { average: toValue(null, SECONDS_UNIT) },
  events: { incoming: { rate: toItemRate(null) }, failed: { rate: toItemRate(null) } },
});

/** What the two processor queries return for one processor. */
export interface ProcessorRow {
  [STATS_COLUMN.incomingRate]?: EsqlValue;
  [STATS_COLUMN.failedRate]?: EsqlValue;
  [STATS_COLUMN.sumItemsIn]?: EsqlValue;
  [STATS_COLUMN.avgDurationPerItem]?: EsqlValue;
}

/**
 * Joins the rows of the rate query and of the sums query on the processor id, into one object
 * per processor. A processor is there when the sums query has a row for it, and the mapper reads
 * a null column as no data.
 */
export const joinProcessorRows = ({
  rateRows,
  sumsRows,
}: {
  rateRows: EsqlRow[];
  sumsRows: EsqlRow[];
}): Record<string, ProcessorRow> => {
  const ratesById = indexById(rateRows, STATS_COLUMN.step);
  const sumsById = indexById(sumsRows, STATS_COLUMN.step);

  return Object.fromEntries(
    Object.entries(sumsById).map(([step, sums]) => [step, { ...ratesById[step], ...sums }])
  );
};

/**
 * Places the joined rows of each processor into its result. A column that ES|QL returned as
 * null stays no data. Processor failures are not queried yet, see `buildProcessorRateQuery`, so
 * there is no failed rate column and that rate stays no data.
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
          },
          failed: { rate: toItemRate(numberOrNull(row[STATS_COLUMN.failedRate])) },
        },
      },
    ])
  );
