/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelevantSkillsStep } from '@kbn/agent-builder-common';
import { createRelevantSkillsStep } from '@kbn/agent-builder-common';
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';

export type PreExecutionStep = RelevantSkillsStep;

/** The bookkeeping steps a run starts with, before the agent produces anything. */
export const createPreExecutionSteps = ({
  relevantSkillsSelection,
}: {
  relevantSkillsSelection?: RelevantSkillSelection;
}): PreExecutionStep[] => {
  const steps: PreExecutionStep[] = [];

  // Relevant-skills step is placed before the event-derived steps so, on replay, its notification
  // renders right after the round's user input and before the round's tool calls.
  if (relevantSkillsSelection && relevantSkillsSelection.skills.length > 0) {
    steps.push(
      createRelevantSkillsStep({ skills: relevantSkillsSelection.skills, source: 'implicit' })
    );
  }

  return steps;
};
