/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';

/**
 * One `generate_esql` call, as seen from inside the harness.
 *
 * Written as JSONL to the file in `ESQL_HARNESS_TRACE_FILE` when that variable is set, which only
 * the offline optimization loop does. The eval runner reads this to build the per-round trace
 * bundle (retries, token spend, the error the model was shown) — none of which is visible from the
 * tool's HTTP response.
 */
export interface EsqlHarnessTraceRecord {
  ts: string;
  nlQuery: string;
  target?: string;
  requestedKeywords?: string[];
  /** Which connector/model actually served the call — the model slot is part of the search space. */
  generateConnectorId?: string;
  generateModel?: string;
  requestDocConnectorId?: string;
  tries: number;
  generatedQueries: string[];
  attempts: Array<{ query?: string; success: boolean; error?: string; timedOut?: boolean }>;
  finalQuery?: string;
  error?: string;
  inputTokens: number;
  outputTokens: number;
  llmCalls: number;
  durationMs: number;
}

const ENV_VAR = 'ESQL_HARNESS_TRACE_FILE';

/** Append a harness trace record when trace collection is enabled; a no-op otherwise. */
export const writeHarnessTrace = (record: EsqlHarnessTraceRecord): void => {
  const path = process.env[ENV_VAR];
  if (!path) {
    return;
  }
  try {
    Fs.appendFileSync(path, `${JSON.stringify(record)}\n`);
  } catch (e) {
    // tracing must never fail a call
  }
};

export const harnessTracingEnabled = (): boolean => Boolean(process.env[ENV_VAR]);
