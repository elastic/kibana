/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionStep,
  PreExecutionWorkflowStep,
  PreExecutionWorkflowStepData,
  RelevantSkillsStep,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  createPreExecutionWorkflowStep,
  createRelevantSkillsStep,
} from '@kbn/agent-builder-common';
import type { CompactedConversation } from './conversation_compactor';
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';

export type PreExecutionStep = CompactionStep | PreExecutionWorkflowStep | RelevantSkillsStep;

/** The bookkeeping steps a run starts with, before the agent produces anything. */
export const createPreExecutionSteps = ({
  compactionResult,
  preExecutionWorkflow,
  relevantSkillsSelection,
}: {
  compactionResult?: CompactedConversation;
  preExecutionWorkflow?: PreExecutionWorkflowStepData;
  relevantSkillsSelection?: RelevantSkillSelection;
}): PreExecutionStep[] => {
  const steps: PreExecutionStep[] = [];

  if (compactionResult?.compactionTriggered && compactionResult.summary) {
    const compactionStep: CompactionStep = {
      type: ConversationRoundStepType.compaction,
      token_count_before: compactionResult.tokensBefore ?? 0,
      token_count_after: compactionResult.tokensAfter ?? 0,
      summarized_round_count: compactionResult.summary.summarized_round_count,
    };
    steps.push(compactionStep);
  }

  if (
    preExecutionWorkflow?.model_context !== undefined ||
    preExecutionWorkflow?.workflow_context !== undefined
  ) {
    steps.push(createPreExecutionWorkflowStep(preExecutionWorkflow));
  }

  // Relevant skills follow workflow context but precede event-derived steps, so its notification
  // renders after the round's user input/context and before the round's tool calls.
  if (relevantSkillsSelection && relevantSkillsSelection.skills.length > 0) {
    steps.push(
      createRelevantSkillsStep({ skills: relevantSkillsSelection.skills, source: 'implicit' })
    );
  }

  return steps;
};
