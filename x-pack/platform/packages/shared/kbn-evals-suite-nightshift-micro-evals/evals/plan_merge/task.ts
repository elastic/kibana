/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { investigationPlanSchema } from '../../src/investigation_plan';
import { renderPrompt, toolSchema } from '../../src/prompt';
import { PLAN_MERGE_SYSTEM_PROMPT, REINFORCEMENT_GUIDANCE, HUMAN_TEMPLATE } from './prompt';
import type { PlanMergeExample, PlanMergeOutput } from './types';

/** Runs the verbatim reinforcement reference prompt in one structured-output call. */
export const runTask = async (
  inferenceClient: Pick<BoundInferenceClient, 'output'>,
  input: PlanMergeExample['input']
): Promise<PlanMergeOutput> => {
  try {
    const response = await inferenceClient.output({
      id: 'plan_merge',
      system: PLAN_MERGE_SYSTEM_PROMPT,
      input: renderPrompt(HUMAN_TEMPLATE, {
        initial_tree: (input.initial_tree_mermaid || '').replace(/(\|)✅\s*/g, '$1'),
        causal_summary: input.causal_summary || '',
        reinforcement_guidance: REINFORCEMENT_GUIDANCE,
      }),
      schema: toolSchema(investigationPlanSchema),
      abortSignal: AbortSignal.timeout(180_000),
    });
    return { merged_mermaid: investigationPlanSchema.parse(response.output).decision_tree_mermaid };
  } catch (error) {
    return { merged_mermaid: '', error: error instanceof Error ? error.message : String(error) };
  }
};
