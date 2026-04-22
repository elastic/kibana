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
export type {
  OtelCollectorTranspilationResult,
  OtelFilterProcessorConfig,
  OtelProcessorConfig,
  OtelTransformProcessorConfig,
  OtelUnsupportedPlaceholder,
} from './types';

/**
 * Transpile a Streamlang DSL document into an OpenTelemetry Collector
 * configuration fragment (logs pipeline).
 *
 * Phase 1 scope: `set`, `rename`, `remove`, `grok`, `uppercase`, `drop_document`
 * and the full condition operator surface. Unsupported actions are preserved
 * in the output as warning placeholders; see `warnings` on the result.
 */
export const transpile = async (
  streamlang: StreamlangDSL
): Promise<OtelCollectorTranspilationResult> => {
  const validated = streamlangDSLSchema.parse(streamlang);
  const flattened = flattenSteps(validated.steps);
  const assembled = assembleOtelConfig(flattened);

  const yaml = renderOtelConfigYaml(assembled.processors, assembled.pipelineProcessors);

  return {
    processors: assembled.processors,
    pipelineProcessors: assembled.pipelineProcessors,
    yaml,
    warnings: assembled.warnings,
  };
};
