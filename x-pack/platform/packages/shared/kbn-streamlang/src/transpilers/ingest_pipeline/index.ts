/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { StreamlangResolverOptions } from '../../../types/resolvers';
import type { StreamlangDSL } from '../../../types/streamlang';
import { streamlangDSLSchema } from '../../../types/streamlang';
import { flattenSteps } from '../shared/flatten_steps';
import { convertStreamlangDSLActionsToIngestPipelineProcessors } from './conversions';
import { applyPostProcessing } from './processors/post_processing';

export interface IngestPipelineTranspilationOptions {
  ignoreMalformed?: boolean;
  traceCustomIdentifiers?: boolean;
}

export interface IngestPipelineTranspilationResult {
  processors: IngestProcessorContainer[];
}

export const transpile = async (
  streamlang: StreamlangDSL,
  transpilationOptions?: IngestPipelineTranspilationOptions,
  resolverOptions?: StreamlangResolverOptions
): Promise<IngestPipelineTranspilationResult> => {
  const validatedStreamlang = streamlangDSLSchema.parse(streamlang);

  const steps = flattenSteps(validatedStreamlang.steps);
  const processors = applyPostProcessing(
    await convertStreamlangDSLActionsToIngestPipelineProcessors(
      steps,
      transpilationOptions,
      resolverOptions
    )
  );

  return {
    processors,
  };
};
