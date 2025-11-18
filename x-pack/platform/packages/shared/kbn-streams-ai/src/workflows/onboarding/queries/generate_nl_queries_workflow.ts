/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { generateNaturalLanguageQueries } from './generate_nl_queries';
import type {
  GenerateQueriesWorkflowApplyResult,
  GenerateQueriesWorkflowGenerateResult,
  GenerateQueriesWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';

export const generateNaturalLanguageQueriesWorkflow: StreamWorkflow<
  Streams.all.Model,
  GenerateQueriesWorkflowInput,
  GenerateQueriesWorkflowGenerateResult,
  GenerateQueriesWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await generateNaturalLanguageQueries({
      definition: input.stream.definition,
      inferenceClient: context.inferenceClient,
      signal: context.signal,
      analysis: input.analysis,
    });

    return {
      change: {
        queries: response,
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
