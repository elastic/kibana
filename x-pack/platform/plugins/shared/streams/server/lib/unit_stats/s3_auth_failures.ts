/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { StreamsUnit } from '@kbn/streams-schema';
import { REQUEST_UNIT, STATS_COLUMN } from './constants';
import { groupById, numberOrNull, stringOrNull, type EsqlRow } from './mappers/esql_rows';
import { toFailureRate, toPercentage, toRate } from './mappers/stats_values';
import { buildS3FailedUploadRatesQuery } from './query_builders/build_s3_auth_failure_queries';
import type { StatsQueryBaseParams } from './query_builders/filters';
import type { DestinationQueryRef } from './query_refs';
import type { AuthFailureStats } from './mappers/map_destination_stats_result';
import { getS3AuthFailureClass, type S3AuthFailureClass } from './s3_auth_failure_classes';

const sumRates = (rows: EsqlRow[]): number =>
  rows.reduce((sum, row) => sum + (numberOrNull(row[STATS_COLUMN.failedRate]) ?? 0), 0);

const toClassFailureRate = ({
  rows,
  attempts,
  failureClass,
}: {
  rows: EsqlRow[];
  attempts: number | null;
  failureClass: S3AuthFailureClass;
}) => {
  const classRows = rows.filter(
    (row) => getS3AuthFailureClass(stringOrNull(row[STATS_COLUMN.reason])) === failureClass
  );

  return toFailureRate({
    rate: sumRates(classRows),
    attempts,
    breakdownRows: classRows,
    column: STATS_COLUMN.failedRate,
    unit: REQUEST_UNIT,
  });
};

/**
 * The authentication and authorization failures of S3 destinations, by destination id.
 *
 * An S3 destination reports why an upload failed only in its duration metric, so the rates count
 * upload attempts per second, not items, and a retry is another attempt. The failed rate of the
 * items metric says nothing here: it counts a batch after its retries, minutes late, so
 * `parentResults` is not read and there is no gate. One query covers every destination.
 *
 * The destination's own `failed` total is the sum of the rates of all its failing codes, the ones
 * with no class too, and replaces the items-based total of the totals query: the items fail late.
 * A class rate is the sum of the rates of the codes that belong to it, 0 when the destination has
 * duration data and none of its codes is in the class. Its breakdown lists those codes, with no
 * collection. Every percentage is a share of the destination's upload attempts. A destination with no rows has no duration data, and is left out. It never throws:
 * when the query fails, `onFailure` hears about it and the result is empty.
 */
export const getS3AuthFailures = async ({
  runQuery,
  baseParams,
  destinations,
  onFailure,
}: {
  runQuery: (query: ComposerQuery) => Promise<EsqlRow[]>;
  baseParams: StatsQueryBaseParams;
  destinations: DestinationQueryRef[];
  parentResults: Record<string, StreamsUnit.StatsDestinationResult>;
  onFailure: (error: unknown, what: string) => void;
}): Promise<Record<string, AuthFailureStats>> => {
  if (destinations.length === 0) return {};

  let rows: EsqlRow[];
  try {
    rows = await runQuery(
      buildS3FailedUploadRatesQuery({ ...baseParams, ids: destinations.map(({ id }) => id) })
    );
  } catch (error) {
    onFailure(error, 'destination authentication and authorization rates');
    return {};
  }

  return Object.fromEntries(
    Object.entries(groupById(rows, STATS_COLUMN.id)).map(
      ([id, idRows]): [string, AuthFailureStats] => {
        // Every row of a destination has the same attempts rate.
        const attempts = numberOrNull(idRows[0][STATS_COLUMN.attemptsRate]);
        const failed = sumRates(idRows);

        return [
          id,
          {
            failed: {
              rate: toRate(failed, REQUEST_UNIT),
              percentage: toPercentage(failed, attempts),
            },
            authentication: toClassFailureRate({
              rows: idRows,
              attempts,
              failureClass: 'authentication',
            }),
            authorization: toClassFailureRate({
              rows: idRows,
              attempts,
              failureClass: 'authorization',
            }),
          },
        ];
      }
    )
  );
};
