/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type {
  GenerateDescriptionWorkflowApplyResult,
  GenerateDescriptionWorkflowGenerateResult,
  GenerateDescriptionWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';
import { generateStreamDescription } from '../../../description/generate_description';

export const generateDescriptionWorkflow: StreamWorkflow<
  Streams.all.Model,
  GenerateDescriptionWorkflowInput,
  GenerateDescriptionWorkflowGenerateResult,
  GenerateDescriptionWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await generateStreamDescription({
      stream: input.stream.definition,
      start: context.start,
      end: context.end,
      esClient: context.esClient,
      inferenceClient: context.inferenceClient,
      signal: context.signal,
    });

    return {
      change: {
        description: response,
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
