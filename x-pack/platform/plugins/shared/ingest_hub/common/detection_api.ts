/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DETECTION_HAS_DATA_PATH = '/internal/ingest_hub/aws/detection/has_data';

/** Validates that a pattern is a safe `logs-<dataset>-*` or `metrics-<dataset>-*` wildcard index pattern. */
export const INDEX_PATTERN_REGEX = /^(logs|metrics)-[a-z0-9_.]+-\*$/;

export interface HasDataRequest {
  /** Comma-joined list of index patterns. */
  dataStreams: string;
  /** ISO8601 start timestamp for the `@timestamp` range filter. */
  start: string;
}

export interface HasDataResponse {
  results: Record<string, boolean>;
}
