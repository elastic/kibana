/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/function';
import type { StreamlangDSL } from '../../../types/streamlang';
import { streamlangDSLSchema } from '../../../types/streamlang';
import { flattenSteps } from '../shared/flatten_steps';
import { convertStreamlangProcessorsToOTTL } from './conversions';
import type { OTTLTransformProcessor, OTTLTranspilationOptions } from './types';

/**
 * Transpiles a Streamlang DSL to an OTTL transform processor
 *
 * @param streamlang The Streamlang DSL to transpile
 * @param streamName The name of the stream (for error messages)
 * @param options Transpilation options
 * @returns An OTTL transform processor configuration
 */
export const transpile = (
  streamlang: StreamlangDSL,
  streamName: string,
  options?: OTTLTranspilationOptions
): OTTLTransformProcessor => {
  const validatedStreamlang = streamlangDSLSchema.parse(streamlang);

  const ottlStatements = pipe(flattenSteps(validatedStreamlang.steps), (steps) =>
    convertStreamlangProcessorsToOTTL(steps, streamName, options)
  );

  return {
    error_mode: options?.ignoreUnsupportedProcessors ? 'ignore' : 'propagate',
    log_statements: ottlStatements,
  };
};

export { convertConditionToOTTL } from './condition_to_ottl';
export { convertToOtelConfig, validateProcessorConfig } from './otel_config_generator';
export * from './types';
export * from './ottl_helpers';
export * from './field_mapping';
