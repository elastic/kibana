/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Deleted counts returned by the SigEvents alerting v2 upgrade reset API. */
export interface StreamsSigEventsResetDeletedCounts {
  queries: number;
  features: number;
  rules: number;
  alertsV1: number;
}

/** Response from POST /internal/streams/sig_events/_reset_kis. */
export interface StreamsSigEventsResetResult {
  /** Stream names that had knowledge indicators before the reset. */
  streams: string[];
  canceledOnboardingCount: number;
  deleted: StreamsSigEventsResetDeletedCounts;
  /** Per-stream KI and rule snapshot counts before deletion. */
  byStream: Record<string, StreamsSigEventsResetDeletedCounts>;
}
