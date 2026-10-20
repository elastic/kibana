/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STATS_COLUMN } from '../constants';
import { indexById, numberOrNull, type EsqlRow, type EsqlValue } from './esql_rows';

/** What the two processor queries return for one processor. */
export interface ProcessorRow {
  [STATS_COLUMN.incomingRate]?: EsqlValue;
  [STATS_COLUMN.failedRate]?: EsqlValue;
  [STATS_COLUMN.sumItemsIn]?: EsqlValue;
  [STATS_COLUMN.avgDurationPerItem]?: EsqlValue;
}

/**
 * Joins the rows of the rate query and of the sums query on the processor id, into one object
 * per processor. A processor is there when the sums query has items in for it. A processor that
 * only has duration documents has no data.
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
    Object.entries(sumsById)
      .filter(([, sums]) => numberOrNull(sums[STATS_COLUMN.sumItemsIn]) !== null)
      .map(([step, sums]) => [step, { ...ratesById[step], ...sums }])
  );
};
