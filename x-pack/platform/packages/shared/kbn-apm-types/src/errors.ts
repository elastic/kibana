/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimestampUs } from '../es_schemas_raw';
import type { Exception } from './es_schemas/raw/error_raw';

export interface ErrorData {
  exception: Exception;
  grouping_key?: string;
  culprit?: string;
  id?: string;
}

export interface Errors {
  error: ErrorData;
  timestamp: TimestampUs | null;
}

export interface ErrorsByTraceId {
  traceErrors: Errors[];
}
