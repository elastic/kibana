/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Sequence and confirm-time context for restore KPI telemetry. */
export interface ChangeHistoryRestoreTelemetryParams {
  restoredFromSequence?: number;
  currentSequence?: number;
  rollbackDistance?: number;
  /** True when the host had unsaved in-editor changes at restore confirm time. */
  hadUnsavedLocalEdits?: boolean;
}

export interface RestoreChangeParams {
  objectId: string;
  changeId: string;
  signal?: AbortSignal;
  /** Sequence context for restore KPI telemetry (confirm/complete events). */
  restoreTelemetry?: ChangeHistoryRestoreTelemetryParams;
  /** Timestamp captured when the user confirmed restore — used to measure restore API duration. */
  confirmedAtMs?: number;
}
