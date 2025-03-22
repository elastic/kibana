/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorDefinition, getProcessorConfig, getProcessorType } from '@kbn/streams-schema';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { conditionToPainless } from './condition_to_painless';

export function formatToIngestProcessors(
  processing: ProcessorDefinition[]
): IngestProcessorContainer[] {
  return processing.map((processor) => {
    const config = getProcessorConfig(processor);
    const type = getProcessorType(processor);
    return {
      [type]: {
        ...config,
        field: config.field,
        if: conditionToPainless(config.if),
      },
    };
  });
}
