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

export interface Error {
  error: ErrorData;
  timestamp?: TimestampUs | undefined;
}

export interface ErrorsByTraceId {
  traceErrors: Error[];
  source: 'apm' | 'unprocessedOtel';
}
