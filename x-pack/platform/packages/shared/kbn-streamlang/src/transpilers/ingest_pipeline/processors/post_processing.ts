/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

// This can be used to apply any post-processing directly to the ingest pipeline processors.
export const applyPostProcessing = (processors: IngestProcessorContainer[]) => {
  return processors.map((processor) => {
    if ('grok' in processor && processor.grok) {
      return {
        grok: {
          ...processor.grok,
          // Use v1 patterns
          ecs_compatibility: 'v1',
        },
      };
    }
    return processor;
  });
};
