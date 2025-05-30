/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorDefinitionWithId } from '@kbn/streams-schema';

interface SampleError {
  message: string;
  sample: Record<string, unknown> | string | null;
}

export interface ProcessorValidation {
  failure_rate: number;
  ignored_failure_rate: number;
  parsed_rate: number;
  skipped_rate: number;
  successful: Array<Record<string, unknown>>;
  errors?: SampleError[];
  ignored_errors?: SampleError[];
}

interface ValidateProcessorsResult {
  processor: ProcessorDefinitionWithId;
  validation: ProcessorValidation;
}

export type ValidateProcessorsCallback = ({}: {
  samples: SearchHit[];
  processors: ProcessorDefinitionWithId[];
}) => Promise<{
  state: {
    validity: 'valid' | 'invalid';
  };
  validations: ValidateProcessorsResult[];
  output: SampleSet;
}>;
