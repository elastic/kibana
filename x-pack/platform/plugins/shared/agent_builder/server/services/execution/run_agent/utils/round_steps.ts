/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompactionStep, RelevantSkillsStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType, createRelevantSkillsStep } from '@kbn/agent-builder-common';
import type { CompactedConversation } from './conversation_compactor';
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';

export type PreExecutionStep = CompactionStep | RelevantSkillsStep;

/** The bookkeeping steps a run starts with, before the agent produces anything. */
export const createPreExecutionSteps = ({
  compactionResult,
  relevantSkillsSelection,
}: {
  compactionResult?: CompactedConversation;
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

  // Relevant-skills step is placed before the event-derived steps so, on replay, its notification
  // renders right after the round's user input and before the round's tool calls.
  if (relevantSkillsSelection && relevantSkillsSelection.skills.length > 0) {
    steps.push(
      createRelevantSkillsStep({ skills: relevantSkillsSelection.skills, source: 'implicit' })
    );
  }

  return steps;
};
