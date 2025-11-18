/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { generateFieldDefinitions } from './generate_field_definitions';
import type {
  OnboardFieldDefinitionsWorkflowApplyResult,
  OnboardFieldDefinitionsWorkflowGenerateResult,
  OnboardFieldDefinitionsWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';

export const onboardFieldDefinitionsWorkflow: StreamWorkflow<
  Streams.ingest.all.Model,
  OnboardFieldDefinitionsWorkflowInput,
  OnboardFieldDefinitionsWorkflowGenerateResult,
  OnboardFieldDefinitionsWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await generateFieldDefinitions({
      definition: input.stream.definition,
      start: context.start,
      end: context.end,
      esClient: context.esClient,
      inferenceClient: context.inferenceClient,
      logger: context.logger,
      signal: context.signal,
    });

    return {
      change: {
        field_definitions: response.field_definitions,
      },
    };
  },
  async apply(context, input, change) {
    return {
      status: 'success',
      stream: input.stream,
    };
  },
};
