/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type {
  OnboardProcessingWorkflowApplyResult,
  OnboardProcessingWorkflowGenerateResult,
  OnboardProcessingWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';
import { generateProcessors } from './generate_processors/generate_processors';

export const onboardProcessingWorkflow: StreamWorkflow<
  Streams.ingest.all.Model,
  OnboardProcessingWorkflowInput,
  OnboardProcessingWorkflowGenerateResult,
  OnboardProcessingWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await generateProcessors({
      definition: input.stream.definition,
      inferenceClient: context.inferenceClient,
      signal: context.signal,
      analysis: input.analysis,
      logger: context.logger,
      processing: context.services.streams.processing,
    });

    return {
      change: {
        processors: response.processors,
      },
      analysis: response.analysis,
    };
  },
  async apply(context, input, change) {
    return {
      status: 'success',
      stream: input.stream,
    };
  },
};
