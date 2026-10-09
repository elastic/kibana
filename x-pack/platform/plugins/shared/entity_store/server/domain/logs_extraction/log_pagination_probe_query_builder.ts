/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  buildLogPageProbeSourceClause,
  NULLIFY_UNMAPPED_FIELDS_SETTING,
  TIMESTAMP_FIELD,
  type LogPageProbeSourceClauseParams,
  type LogSlicePaginationParams,
} from './query_builder_commons';

export const LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD = 'total_logs';

export const LOG_EXTRACTION_SAMPLE_PROBABILITY = 0.1;

export const roundSampleProbability = (sampleProbability: number): number =>
  Math.round(sampleProbability * 10000) / 10000;

export const scaledProbeLimit = (
  maxLogsPerPage: number,
  sampleProbability: number = LOG_EXTRACTION_SAMPLE_PROBABILITY
): number => Math.max(1, Math.round(maxLogsPerPage * sampleProbability));

/**
 * Returns at most one row: the inclusive slice end (`MAX(@timestamp)` of the capped, sampled
 * page) and the count of sampled docs in this slice (`COUNT(*)`).
 * If `total_logs` is below the scaled sample limit, no more pages to process.
 * If the scaled limit was saturated, more slices remain.
 *
 * `sampleProbability >= 1` omits the `SAMPLE` stage entirely rather than emitting a no-op
 */
export function buildLogPaginationCursorProbeEsql(
  params: LogPageProbeSourceClauseParams & { maxLogsPerPage: number; sampleProbability?: number }
): string {
  const {
    maxLogsPerPage,
    sampleProbability: rawSampleProbability = LOG_EXTRACTION_SAMPLE_PROBABILITY,
    ...sourceParams
  } = params;
  const sampleProbability = roundSampleProbability(rawSampleProbability);
  const sampleStage = sampleProbability < 1 ? `\n  | SAMPLE ${sampleProbability}` : '';
  return (
    `${NULLIFY_UNMAPPED_FIELDS_SETTING}\n` +
    buildLogPageProbeSourceClause(sourceParams) +
    `${sampleStage}
  | SORT ${TIMESTAMP_FIELD} ASC
  | LIMIT ${scaledProbeLimit(maxLogsPerPage, sampleProbability)}
  | STATS ${TIMESTAMP_FIELD} = MAX(${TIMESTAMP_FIELD}), ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} = COUNT(*)`
  );
}

export interface LogPaginationCursorParsedRow {
  logsPaginationCursor: LogSlicePaginationParams;
  /** Number of sampled docs in this slice (at most the scaled sample limit due to `LIMIT`). */
  sliceDocCount: number;
}

export function parseLogPaginationCursorRow(
  esqlResponse: ESQLSearchResponse
): LogPaginationCursorParsedRow | undefined {
  if (esqlResponse.values.length === 0 || esqlResponse.documents_found === 0) {
    return undefined;
  }

  const tsIdx = esqlResponse.columns.findIndex(({ name }) => name === TIMESTAMP_FIELD);
  const totalIdx = esqlResponse.columns.findIndex(
    ({ name }) => name === LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD
  );
  const row = esqlResponse.values[0];

  if (tsIdx === -1 || totalIdx === -1) {
    if (totalIdx > -1 && row[totalIdx] === 0) {
      // A page without results can return total values only since MAX(@timestamp) is NULL
      return undefined;
    }

    throw new Error(
      `Expected ${TIMESTAMP_FIELD} and ${LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD} columns in log pagination cursor probe response`
    );
  }

  return {
    logsPaginationCursor: {
      timestampCursor: String(row[tsIdx]),
    },
    sliceDocCount: Number(row[totalIdx]),
  };
}

export type LogPaginationCursor =
  | {
      hasLogsToProcess: false;
      /** No docs were sampled at all, so this cannot be the start of another page. */
      isLastLogsPage: true;
      /** No sampled rows to extrapolate from — always 0. */
      sliceLogCount: 0;
    }
  | {
      hasLogsToProcess: true;
      logsPaginationCursor: LogSlicePaginationParams;
      isLastLogsPage: boolean;
      /**
       * Estimated real log count in this slice: `round(total_logs / sampleProbability)`.
       * No longer an exact count now that the probe samples — used for volume-cap accounting,
       * where the ~1-3% estimation error is within the existing cap tolerance.
       */
      sliceLogCount: number;
    };

export function interpretLogPaginationCursorRows(
  row: LogPaginationCursorParsedRow | undefined,
  maxLogsPerPage: number,
  rawSampleProbability: number = LOG_EXTRACTION_SAMPLE_PROBABILITY
): LogPaginationCursor {
  if (row === undefined) {
    return { hasLogsToProcess: false, isLastLogsPage: true, sliceLogCount: 0 };
  }
  const sampleProbability = roundSampleProbability(rawSampleProbability);
  const { logsPaginationCursor, sliceDocCount } = row;
  const scaledLimit = scaledProbeLimit(maxLogsPerPage, sampleProbability);
  return {
    hasLogsToProcess: true,
    logsPaginationCursor,
    isLastLogsPage: sliceDocCount < scaledLimit,
    // Estimated slice log count, based on sampled count we extrapolate to the real count.
    sliceLogCount: Math.round(sliceDocCount / sampleProbability),
  };
}
