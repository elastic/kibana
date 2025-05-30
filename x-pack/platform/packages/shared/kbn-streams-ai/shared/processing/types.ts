/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorDefinitionWithId } from '@kbn/streams-schema';

export interface SampleError {
  source?: Record<string, any>;
  error: {
    message: string;
  };
}

export interface ProcessorValidationResult {
  processor: ProcessorDefinitionWithId;
  validity: 'success' | 'partial' | 'failure';
  output: SearchHit[];
  result: {
    added_fields?: Record<string, Array<string | number | boolean>>;
    failure_rate: number;
    ignored_failure_rate: number;
    success_rate: number;
    successful?: Array<Record<string, any>>;
    errors?: SampleError[];
    ignored_errors?: SampleError[];
    non_additive_failure?: string;
  };
}

export interface ProcessingService {
  simulate: (
    name: string,
    {}: {
      samples: SearchHit[];
      processor: ProcessorDefinitionWithId;
    }
  ) => Promise<ProcessorValidationResult>;
}
