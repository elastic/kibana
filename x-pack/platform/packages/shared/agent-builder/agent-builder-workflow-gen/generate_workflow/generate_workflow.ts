/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import { createGenerateWorkflowGraph } from './graph';
import type { GenerateWorkflowParams, GenerateWorkflowResponse } from './types';

export const generateWorkflow = async ({
  nlQuery,
  additionalContext,
  additionalInstructions,
  maxRetries = 3,
  model,
  logger,
  request,
  spaceId,
  workflowsApi,
}: GenerateWorkflowParams): Promise<GenerateWorkflowResponse> => {
  const graph = createGenerateWorkflowGraph({
    model,
    api: workflowsApi,
    request,
    spaceId,
    logger,
  });

  return withActiveInferenceSpan(
    'GenerateWorkflowGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const out = await graph.invoke(
        { nlQuery, additionalContext, additionalInstructions, maxRetries },
        {
          recursionLimit: 40,
          tags: ['generate_workflow'],
          metadata: { graphName: 'generate_workflow' },
        }
      );

      if (!out.validation?.valid || !out.validation.parsedWorkflow) {
        const reason = out.validation?.errors.length
          ? out.validation.errors.join('; ')
          : 'no validated workflow produced';
        throw new Error(`Could not generate workflow: ${reason}`);
      }

      return { workflow: out.validation.parsedWorkflow };
    }
  );
};
