/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type {
  OnboardRulesWorkflowApplyResult,
  OnboardRulesWorkflowGenerateResult,
  OnboardRulesWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../../types';
import { generateRules } from './generate_rules';

export const onboardRulesWorkflow: StreamWorkflow<
  Streams.all.Model,
  OnboardRulesWorkflowInput,
  OnboardRulesWorkflowGenerateResult,
  OnboardRulesWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await generateRules({
      definition: input.stream.definition,
      inferenceClient: context.inferenceClient,
      signal: context.signal,
      analysis: input.analysis,
      logger: context.logger,
      start: context.start,
      end: context.end,
      esClient: context.esClient,
      queries: input.queries,
    });

    return {
      change: {
        rules: response,
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
