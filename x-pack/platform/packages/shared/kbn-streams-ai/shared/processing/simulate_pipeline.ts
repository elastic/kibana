/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorDefinitionWithId } from '@kbn/streams-schema';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ProcessingService, ProcessorValidationResult } from './types';

export async function simulatePipeline(
  name: string,
  {
    samples,
    service,
    processors,
  }: {
    samples: SearchHit[];
    service: ProcessingService;
    processors: ProcessorDefinitionWithId[];
  }
) {
  let nextSamples = samples;

  const results: ProcessorValidationResult[] = [];

  for (const processor of processors) {
    const { result, validity, output } = await service.simulate(name, {
      processor,
      samples: nextSamples,
    });

    nextSamples = output;

    results.push({
      processor,
      result,
      validity,
      output,
    });
  }

  return {
    results,
    output: nextSamples,
  };
}
