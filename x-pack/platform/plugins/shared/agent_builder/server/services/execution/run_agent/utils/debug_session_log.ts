/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendFileSync } from 'fs';

const DEBUG_ENDPOINT = 'http://127.0.0.1:7328/ingest/79a1b10c-b3e0-4f72-abbd-d987542fa3d3';
const DEBUG_LOG_PATH = '/Users/baileycash/Documents/GitHub/kibana/.cursor/debug-2d3778.log';
const DEBUG_SESSION_ID = '2d3778';

/** Temporary dual-write debug logger for session 2d3778 — remove after bugfix. */
export const debugSessionLog = (payload: {
  location: string;
  message: string;
  hypothesisId: string;
  data?: Record<string, unknown>;
  runId?: string;
}): void => {
  const body = {
    sessionId: DEBUG_SESSION_ID,
    runId: payload.runId ?? 'post-fix',
    hypothesisId: payload.hypothesisId,
    location: payload.location,
    message: payload.message,
    data: payload.data ?? {},
    timestamp: Date.now(),
  };
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify(body),
  }).catch(() => {});
  try {
    appendFileSync(DEBUG_LOG_PATH, `${JSON.stringify(body)}\n`);
  } catch {
    // ignore filesystem errors in restricted environments
  }
  // #endregion
};
