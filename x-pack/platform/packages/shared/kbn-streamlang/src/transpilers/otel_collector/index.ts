/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../../types/streamlang';
import { streamlangDSLSchema } from '../../../types/streamlang';
import { flattenSteps } from '../shared/flatten_steps';
import { assembleOtelConfig } from './conversions';
import type { OtelCollectorTranspilationResult } from './types';
import { renderOtelConfigYaml } from './yaml';

export { conditionToOttl } from './condition_to_ottl';
export type { OtelErrorMode } from './conversions';
export type {
  OtelCollectorTranspilationResult,
  OtelFilterProcessorConfig,
  OtelProcessorConfig,
  OtelTransformProcessorConfig,
  OtelUnsupportedPlaceholder,
} from './types';

export interface OtelTranspileOptions {
  /**
   * Controls how the OTel Collector processor handles OTTL evaluation errors.
   * - `'ignore'` (default): errors are silently swallowed; the log record passes through unchanged.
   * - `'silent'`: same as ignore but without logging.
   * - `'propagate'`: errors propagate to the pipeline's error handler (useful for debugging).
   *
   * For production deployments `'propagate'` is strongly recommended so that evaluation
   * failures surface rather than being silently swallowed.
   */
  errorMode?: 'ignore' | 'silent' | 'propagate';
}

/**
 * Transpile a Streamlang DSL document into an OpenTelemetry Collector
 * configuration fragment (logs pipeline).
 *
 * Supported actions: `set`, `rename`, `remove`, `grok`, `uppercase`, `lowercase`,
 * `trim`, `replace`, `split`, `convert`, `redact`, `concat`, `join`,
 * `drop_document`, `append`, `date`, `json_extract`, and the full condition
 * operator surface.
 *
 * Actions with no OTTL equivalent (`enrich`, `math`, `network_direction`, `sort`,
 * `remove_by_prefix`, `dissect`, `manual_ingest_pipeline`) throw a descriptive
 * error — the transpiler does not produce a partial config that silently drops
 * processors.
 *
 * Cross-target semantic gap — `ignore_missing: false`:
 * OTTL has no "error if nil" primitive. The OTel transpiler approximates this
 * with a `<field> != nil` guard — a silent skip rather than a loud failure.
 * A transpile-time warning is emitted when `ignore_missing: false` is explicit.
 */
export const transpile = async (
  streamlang: StreamlangDSL,
  options: OtelTranspileOptions = {}
): Promise<OtelCollectorTranspilationResult> => {
  const { errorMode = 'ignore' } = options;
  const validated = streamlangDSLSchema.parse(streamlang);
  const flattened = flattenSteps(validated.steps);
  const assembled = assembleOtelConfig(flattened, errorMode);

  const yaml = renderOtelConfigYaml(assembled.processors, assembled.pipelineProcessors);

  return {
    processors: assembled.processors,
    pipelineProcessors: assembled.pipelineProcessors,
    yaml,
    warnings: assembled.warnings,
  };
};
