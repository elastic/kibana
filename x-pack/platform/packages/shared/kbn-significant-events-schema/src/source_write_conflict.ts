/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Why a write to a source's knowledge answered 409:
 * - `lease_held`: another write holds the source's write lease.
 * - `reconcile_pending`: the source query was edited and the reconcile has not applied it yet.
 * - `source_disabled`: the source is disabled.
 * - `stale_revision`: the request was prepared against an older revision of the source query.
 */
export const SOURCE_WRITE_CONFLICT_REASONS = [
  'lease_held',
  'reconcile_pending',
  'source_disabled',
  'stale_revision',
] as const;

export type SourceWriteConflictReason = (typeof SOURCE_WRITE_CONFLICT_REASONS)[number];

export const isSourceWriteConflictReason = (value: unknown): value is SourceWriteConflictReason =>
  SOURCE_WRITE_CONFLICT_REASONS.some((reason) => reason === value);

const RETRYABLE_BY_REASON: Record<SourceWriteConflictReason, boolean> = {
  lease_held: true,
  reconcile_pending: true,
  source_disabled: false,
  stale_revision: false,
};

/** Whether repeating the same request later can succeed without the user changing anything. */
export const isRetryableSourceWriteConflict = (reason: SourceWriteConflictReason): boolean =>
  RETRYABLE_BY_REASON[reason];
