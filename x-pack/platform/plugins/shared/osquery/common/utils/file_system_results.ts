/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../constants';

/**
 * The result-window ceiling for a single directory listing. Mirrors the
 * Elasticsearch/Osquery results pagination ceiling — beyond this the UI must
 * indicate truncation and point the user to Discover.
 */
export const FILE_LISTING_WINDOW_CEILING = DEFAULT_MAX_TABLE_QUERY_SIZE;

/**
 * The distinct outcomes of a directory listing. These must NOT collapse into a
 * single "no data" state: on macOS an access-denied directory (no Full Disk
 * Access / TCC) returns zero rows and is indistinguishable from a genuinely
 * empty directory unless we treat them separately.
 */
export type FileListingState = 'ok' | 'empty' | 'access_denied' | 'error';

export interface FileListingResult<TRow> {
  state: FileListingState;
  rows: TRow[];
  /** True when the row count hit the window ceiling and was capped. */
  truncated: boolean;
  /** Total rows reported before any ceiling was applied, when known. */
  total?: number;
}

interface ClassifyParams<TRow> {
  rows: TRow[] | undefined;
  /** Total rows reported by the search, before truncation (if available). */
  total?: number;
  /** Whether the underlying query errored or the host was offline/timed out. */
  errored?: boolean;
  /**
   * Hint that an empty result is likely a permission/TCC denial rather than a
   * genuinely empty directory (e.g. a known macOS protected path on a host
   * lacking Full Disk Access).
   */
  likelyAccessDenied?: boolean;
}

/**
 * Classifies a directory-listing response into one of the distinct states and
 * exposes the truncation flag, enforcing the window ceiling on the returned
 * rows. Empty-vs-denied is decided by the caller-supplied `likelyAccessDenied`
 * hint since Osquery itself reports both as zero rows.
 */
export const classifyFileListing = <TRow>({
  rows,
  total,
  errored,
  likelyAccessDenied,
}: ClassifyParams<TRow>): FileListingResult<TRow> => {
  if (errored) {
    return { state: 'error', rows: [], truncated: false, total };
  }

  const safeRows = rows ?? [];
  const reportedTotal = total ?? safeRows.length;
  const truncated = reportedTotal > FILE_LISTING_WINDOW_CEILING;
  const cappedRows = truncated ? safeRows.slice(0, FILE_LISTING_WINDOW_CEILING) : safeRows;

  if (cappedRows.length === 0) {
    return {
      state: likelyAccessDenied ? 'access_denied' : 'empty',
      rows: [],
      truncated: false,
      total: reportedTotal,
    };
  }

  return { state: 'ok', rows: cappedRows, truncated, total: reportedTotal };
};
