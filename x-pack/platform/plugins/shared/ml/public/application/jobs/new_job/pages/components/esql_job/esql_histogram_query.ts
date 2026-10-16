/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ESQL_HISTOGRAM_BUCKET_COUNT = 50;
export const ESQL_HISTOGRAM_COUNT_COLUMN = 'esql_histogram_count';
export const ESQL_HISTOGRAM_TIME_COLUMN = 'esql_histogram_time';

export interface BuildEsqlHistogramQueryOptions {
  /** The user's base ES|QL query (query & time-range step, LEAD DECISION g2sz.10). */
  query: string;
  /** The output column the query emits time on (`EsqlWizardState.emittedTimeField`). */
  timeField: string;
  /** Absolute or datemath start of the wizard's selected time range. */
  start: string;
  /** Absolute or datemath end of the wizard's selected time range. */
  end: string;
  /** Number of buckets to spread the range over; defaults to ~50 per LEAD DECISION. */
  buckets?: number;
}

/**
 * Builds the row-count-per-bucket ES|QL query for the Query & time range
 * step's histogram (LEAD DECISION 2026-09-29, g2sz.10):
 *
 *   <query> | STATS c = COUNT(*) BY t = BUCKET(<emittedTimeField>, ~50, start, end)
 *
 * A pure string builder — no ES|QL parsing — so it is unit-testable without a
 * cluster. `BUCKET(field, buckets, start, end)` requires start/end to be
 * ES|QL-quotable literals; callers must resolve any datemath (e.g. `now-15m`)
 * to absolute timestamps before calling this (BUCKET does not evaluate
 * datemath).
 */
export const buildEsqlHistogramQuery = ({
  query,
  timeField,
  start,
  end,
  buckets = ESQL_HISTOGRAM_BUCKET_COUNT,
}: BuildEsqlHistogramQueryOptions): string => {
  const trimmedQuery = query
    .trim()
    .replace(/\|\s*$/, '')
    .trimEnd();

  return (
    `${trimmedQuery} | STATS ${ESQL_HISTOGRAM_COUNT_COLUMN} = COUNT(*) BY ` +
    `${ESQL_HISTOGRAM_TIME_COLUMN} = BUCKET(${timeField}, ${buckets}, "${start}", "${end}") ` +
    `| SORT ${ESQL_HISTOGRAM_TIME_COLUMN} ASC`
  );
};
