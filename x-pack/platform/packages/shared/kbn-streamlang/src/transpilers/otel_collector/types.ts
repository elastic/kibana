/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Structured OTel collector processor configs keyed by processor instance name
 * (e.g. `"transform/streamlang"`, `"filter/streamlang"`). Shape matches what
 * the collector expects under the top-level `processors:` key.
 */
export type OtelProcessorConfig =
  | OtelTransformProcessorConfig
  | OtelFilterProcessorConfig
  | OtelUnsupportedPlaceholder;

export interface OtelTransformProcessorConfig {
  error_mode: 'ignore' | 'silent' | 'propagate';
  log_statements: string[];
}

export interface OtelFilterProcessorConfig {
  error_mode: 'ignore' | 'silent' | 'propagate';
  log_conditions: string[];
}

/**
 * Placeholder for Streamlang actions that have no OTel equivalent. Stored in
 * the structured output as a flagged config so callers can inspect it; the
 * YAML serializer renders it as comments so the emitted config stays valid.
 */
export interface OtelUnsupportedPlaceholder {
  __streamlang_unsupported: true;
  action: string;
  reason: string;
}

export interface OtelCollectorTranspilationResult {
  /** Structured form — keyed by OTel processor instance name. */
  processors: Record<string, OtelProcessorConfig>;
  /** Ordered processor names as they should appear in `service.pipelines.logs.processors`. */
  pipelineProcessors: string[];
  /** YAML fragment ready to paste under the collector's `processors:` key. */
  yaml: string;
  /** Non-fatal issues: unsupported actions, lossy conversions, etc. */
  warnings: string[];
}
