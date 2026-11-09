/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Crypto from 'crypto';
import Fs from 'fs';
import Path from 'path';

/**
 * One `generate_esql` call, as seen from inside the harness.
 *
 * Written as JSONL to `ESQL_HARNESS_TRACE_FILE` when that variable is set, which only the
 * offline optimization loop does. The eval runner reads this to attribute retries, token spend
 * and the error the model was shown — none of which is visible in the tool's HTTP response.
 */
export interface EsqlHarnessTraceRecord {
  ts: string;
  nlQuery: string;
  target?: string;
  requestedKeywords?: string[];
  /** Connector that served the generation call — the model is part of the variant. */
  generateConnectorId?: string;
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

const FILE_VAR = 'ESQL_HARNESS_TRACE_FILE';
const DIR_VAR = 'ESQL_HARNESS_TRACE_DIR';

/** Append a harness trace record when trace collection is enabled; a no-op otherwise. */
export const writeHarnessTrace = (record: EsqlHarnessTraceRecord): void => {
  const path = process.env[FILE_VAR];
  if (!path) {
    return;
  }
  try {
    Fs.appendFileSync(path, `${JSON.stringify(record)}\n`);
  } catch (e) {
    // tracing must never fail a call
  }
};

export const harnessTracingEnabled = (): boolean => Boolean(process.env[FILE_VAR]);

export const fullTracingEnabled = (): boolean => Boolean(process.env[DIR_VAR]);

/**
 * Everything the graph did on one call: the prompts that were sent, the model's replies, the
 * resource context it was given, the documentation it asked for, and every action in order.
 *
 * Written as one file per call to `ESQL_HARNESS_TRACE_DIR`. The summary record above is enough
 * to score a run; this is what lets a proposer see *why* a query came out the way it did
 * instead of inferring it from the query text.
 */
export const writeFullHarnessTrace = (payload: Record<string, unknown>): void => {
  const dir = process.env[DIR_VAR];
  if (!dir) {
    return;
  }
  try {
    Fs.mkdirSync(dir, { recursive: true });
    const key = Crypto.createHash('sha256')
      .update(String(payload.nlQuery ?? ''))
      .digest('hex')
      .slice(0, 10);
    const file = Path.join(dir, `${key}-${Date.now()}.json`);
    Fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  } catch (e) {
    // tracing must never fail a call
  }
};
