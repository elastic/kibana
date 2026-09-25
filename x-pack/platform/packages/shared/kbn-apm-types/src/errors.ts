/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimestampUs } from '../es_schemas_raw';
import type { Exception } from './es_schemas/raw/error_raw';

export interface ErrorData {
  exception?: Exception;
  grouping_key?: string;
  culprit?: string;
  id?: string;
  log?: {
    message?: string;
  };
}

export type TraceErrorSource = 'apm' | 'unprocessedOtel';

/**
 * Per-row aggregate used in the waterfall click payload. A row carrying both
 * classic APM errors and unprocessed OTel exception logs is 'mixed'.
 */
export type TraceErrorRowSource = TraceErrorSource | 'mixed';

export interface Error {
  id: string;
  index?: string;
  parent?: { id?: string };
  trace?: { id?: string };
  span?: { id?: string };
  transaction?: { id?: string };
  service: { name: string };
  eventName?: string;
  error: ErrorData;
  timestamp: TimestampUs;
  /** Identifies where this error document was fetched from. */
  source: TraceErrorSource;
}

export interface ErrorsByTraceId {
  traceErrors: Error[];
}
