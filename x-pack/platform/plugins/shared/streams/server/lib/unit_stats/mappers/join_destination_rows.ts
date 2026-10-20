/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STATS_COLUMN } from '../constants';
import { groupById, indexById, type EsqlRow, type EsqlValue } from './esql_rows';

/** What the two destination queries return for one destination. */
export interface DestinationRow {
  [STATS_COLUMN.incomingRate]?: EsqlValue;
  [STATS_COLUMN.failedRate]?: EsqlValue;
  [STATS_COLUMN.avgLatency]?: EsqlValue;
  series: EsqlRow[];
}

/**
 * Joins the rows of the rate query and of the sums query on the destination id, into one object
 * per destination. A destination is there when the sums query has rows for it (it has items in
 * the window). The series keeps the order of the rows, which the query sorts by bucket.
 */
export const joinDestinationRows = ({
  rateRows,
  sumsRows,
}: {
  rateRows: EsqlRow[];
  sumsRows: EsqlRow[];
}): Record<string, DestinationRow> => {
  const ratesById = indexById(rateRows, STATS_COLUMN.id);
  const seriesById = groupById(sumsRows, STATS_COLUMN.id);

  return Object.fromEntries(
    Object.entries(seriesById).map(([id, series]) => [id, { ...ratesById[id], series }])
  );
};
