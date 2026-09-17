/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, type Message, type BoundInferenceClient } from '@kbn/inference-common';
import { investigationPlanSchema } from '../../src/investigation_plan';
import { renderPrompt, toolSchema } from '../../src/prompt';
import { PLAN_EXTRACTION_SYSTEM_PROMPT, BASE_TREE_TEMPLATE, HUMAN_TEMPLATE } from './prompt';
import type { PlanExtractionExample, PlanExtractionOutput } from './types';

/** Runs the verbatim extraction reference prompt in one structured-output call. */
export const runTask = async (
  inferenceClient: Pick<BoundInferenceClient, 'output'>,
  input: PlanExtractionExample['input']
): Promise<PlanExtractionOutput> => {
  const baseTree = input.existing_tree_mermaid;
  const baseSection = baseTree
    ? renderPrompt(BASE_TREE_TEMPLATE, { base_tree_mermaid: baseTree })
    : '';
  try {
    const response = await inferenceClient.output({
      id: 'plan_extraction',
      system: PLAN_EXTRACTION_SYSTEM_PROMPT,
      previousMessages: (input.messages ?? []).map(
        ({ type = 'human', content = '' }): Message =>
          ['ai', 'assistant'].includes(type.toLowerCase())
            ? { role: MessageRole.Assistant, content }
            : { role: MessageRole.User, content }
      ),
      input: renderPrompt(HUMAN_TEMPLATE, { base_tree_section: baseSection }),
      schema: toolSchema(investigationPlanSchema),
      abortSignal: AbortSignal.timeout(120_000),
    });
    return investigationPlanSchema.parse(response.output);
  } catch (error) {
    return {
      decision_tree_mermaid: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
