/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  DESTINATION_DURATION_FIELD,
  DESTINATION_ID_FIELD,
  ERROR_TYPE_FIELD,
  ESQL_MAX_ROWS,
  OUTCOME_FIELD,
  STATS_COLUMN,
  UNIT_METRICS_STREAM,
} from '../constants';
import {
  filterDestinations,
  type DestinationStatsQueryParams,
} from './build_destination_stats_queries';

/**
 * The failed uploads of S3 destinations per second, by error code, from a plain `FROM`.
 *
 * An S3 destination reports why an upload failed only in its duration metric, as `error.type`: the
 * code of the S3 error, or a word such as `timeout` or `dns`. Its items metric has no reason, and
 * counts a batch only after the retries, minutes later.
 *
 * So this counts upload attempts, not items. The histogram has one observation for each attempt, a
 * retry is another attempt, and nothing marks a retry. `COUNT` of the histogram field is that number
 * of observations.
 *
 * The time is the destination's: `INLINE STATS` finds the first delta of the destination over all
 * its duration documents, before the failures are counted, so every code shares one denominator.
 *
 * One row for each destination and code, and a row with a null code for the destination's
 * successful uploads, whose rate is 0. A destination with no row has no duration data.
 */
export const buildS3FailedUploadRatesQuery = (
  params: DestinationStatsQueryParams
): ComposerQuery => {
  const duration = normalizeColumn(DESTINATION_DURATION_FIELD);
  const outcome = normalizeColumn(OUTCOME_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const errorType = normalizeColumn(ERROR_TYPE_FIELD);
  const failedRate = esql.col(STATS_COLUMN.failedRate);
  const id = esql.col(STATS_COLUMN.id);
  const reason = esql.col(STATS_COLUMN.reason);
  const { end } = params.window;

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`WHERE ${duration} IS NOT NULL`
    .pipe`INLINE STATS covered_from = MIN(start_timestamp) BY ${destinationId}`
    .pipe`STATS failed = COUNT(${duration}) WHERE ${outcome} == "failure",
        covered_from = MIN(covered_from)
      BY ${id} = ${destinationId}, ${reason} = ${errorType}`
    .pipe`EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, ${end}) / 1000.0`
    .pipe`EVAL ${failedRate} = failed / window_seconds`.pipe`KEEP ${id}, ${reason}, ${failedRate}`
    .pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
