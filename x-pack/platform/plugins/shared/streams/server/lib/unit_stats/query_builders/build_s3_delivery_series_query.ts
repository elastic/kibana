/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLSingleAstItem } from '@elastic/esql/types';
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
  S3_AUTHENTICATION_ERROR_CODES,
  S3_AUTHORIZATION_ERROR_CODES,
} from '../s3_auth_failure_classes';
import {
  filterDestinations,
  type DestinationStatsQueryParams,
} from './build_destination_stats_queries';

/** Keeps a row whose error type is one of `codes`. */
const hasErrorType = (codes: readonly string[]): ESQLSingleAstItem =>
  Builder.expression.func.binary('in', [
    normalizeColumn(ERROR_TYPE_FIELD),
    Builder.expression.list.tuple({
      values: codes.map((code) => Builder.expression.literal.string(code)),
    }),
  ]);

/**
 * What S3 destinations attempted and what failed, per destination and time bucket, from a plain
 * `FROM`, for a chart of delivery. It has the columns of `buildElasticsearchDeliverySeriesQuery`,
 * but they count upload attempts, not items.
 *
 * An S3 destination reports why an upload failed only in its duration metric, which has one
 * observation for each attempt, so every count is a `COUNT` of that field, as in
 * `buildS3FailedUploadRatesQuery`. A retry is another attempt.
 * - `total_items` is every attempt
 * - `failed_items` is the attempts with the outcome `failure`
 * - `authentication_items` and `authorization_items` are the failed attempts whose error code
 *   belongs to the class, from the same lists as the class rates
 *
 * So the classes are parts of the failed count, which is a part of the total. It returns at most
 * `ESQL_MAX_ROWS` rows and has no breakdown, as the Elasticsearch one.
 */
export const buildS3DeliverySeriesQuery = ({
  bucketMs,
  ...params
}: DestinationStatsQueryParams & { bucketMs: number }): ComposerQuery => {
  const duration = normalizeColumn(DESTINATION_DURATION_FIELD);
  const outcome = normalizeColumn(OUTCOME_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const totalItems = esql.col(STATS_COLUMN.totalItems);
  const failedItems = esql.col(STATS_COLUMN.failedItems);
  const authenticationItems = esql.col(STATS_COLUMN.authenticationItems);
  const authorizationItems = esql.col(STATS_COLUMN.authorizationItems);
  const id = esql.col(STATS_COLUMN.id);
  const bucket = esql.col(STATS_COLUMN.bucket);
  const isAuthenticationCode = hasErrorType(S3_AUTHENTICATION_ERROR_CODES);
  const isAuthorizationCode = hasErrorType(S3_AUTHORIZATION_ERROR_CODES);

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`WHERE ${duration} IS NOT NULL`.pipe`STATS ${totalItems} = COUNT(${duration}),
        ${failedItems} = COUNT(${duration}) WHERE ${outcome} == "failure",
        ${authenticationItems} = COUNT(${duration}) WHERE ${outcome} == "failure" AND ${isAuthenticationCode},
        ${authorizationItems} = COUNT(${duration}) WHERE ${outcome} == "failure" AND ${isAuthorizationCode}
      BY ${id} = ${destinationId}, ${bucket} = BUCKET(@timestamp, ${bucketMs} ms)`
    .pipe`SORT ${bucket}`.pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
