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
import { convertStreamlangDSLActionsToIngestPipelineProcessors } from './conversions';
import { applyPostProcessing } from './processors/post_processing';

export interface IngestPipelineTranspilationOptions {
  ignoreMalformed?: boolean;
  traceCustomIdentifiers?: boolean;
}

export const transpile = (
  streamlang: StreamlangDSL,
  transpilationOptions?: IngestPipelineTranspilationOptions
) => {
  const validatedStreamlang = streamlangDSLSchema.parse(streamlang);

  const processors = pipe(
    flattenSteps(validatedStreamlang.steps),
    (steps) => convertStreamlangDSLActionsToIngestPipelineProcessors(steps, transpilationOptions),
    applyPostProcessing
  );

  return {
    processors,
  };
};
