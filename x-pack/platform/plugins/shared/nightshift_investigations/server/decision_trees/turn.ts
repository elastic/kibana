/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildTurnPrompt,
  selectTurnScript,
  symptomSlugFromTreeId,
} from '@kbn/nightshift-decision-trees';
import type { DecisionTreeTurnKind, LearningRecord } from '@kbn/nightshift-decision-trees';
import type { DecisionTreeSummary } from './store';
import { workspacePathForTree } from './materialize';

const MAX_TRANSCRIPT_CHARS = 20_000;

/**
 * A confirmed hypothesis in the investigator's structured output is what makes a path causal, and
 * therefore what separates reinforcing a branch from merely extending the tree.
 */
const CONFIRMED_HYPOTHESIS_RE = /"status"\s*:\s*"confirmed"|\bstatus:\s*['"]?confirmed\b/i;

export const deriveCausalConfirmed = (response: string): boolean =>
  CONFIRMED_HYPOTHESIS_RE.test(response);

/**
 * Decides whether this round seeds the tree or builds on it, using only trees the investigator
 * actually opened. A first version is still being established; a later version is a follow-up.
 */
export const deriveTurnKind = (trees: DecisionTreeSummary[]): DecisionTreeTurnKind =>
  trees.some((tree) => tree.version > 1) ? 'feedback_reinforcement' : 'initial_investigation';

/** Assembles the message handed to the reinforcement agent for one round. */
export const buildReinforcementPrompt = ({
  trees,
  learnings,
  connectorNames,
  prompt,
  response,
}: {
  trees: DecisionTreeSummary[];
  learnings: LearningRecord[];
  connectorNames: string[];
  prompt: string;
  response: string;
}): string => {
  const turnKind = deriveTurnKind(trees);
  const script = selectTurnScript({
    turnKind,
    causalConfirmed: deriveCausalConfirmed(response),
    // True only when the investigator read at least one tree file this round. Callers must pass
    // that accessed subset — not every tree in the index.
    hasExistingTrees: trees.length > 0,
  });

  const relevantLearnings = learnings.filter((learning) => {
    if (learning.tree_id === undefined) {
      return false;
    }
    const learningSlug = symptomSlugFromTreeId(learning.tree_id);
    return trees.some((tree) => learningSlug === tree.symptom);
  });

  const turnPrompt = buildTurnPrompt({
    editableTreePaths: trees.map(
      (tree) => `${tree.tree_id} — ${workspacePathForTree(tree.tree_id)}`
    ),
    activeSystemLearnings: relevantLearnings
      .filter((learning) => learning.kind === 'system')
      .map((learning) => learning.content),
    activeToolLearnings: relevantLearnings
      .filter((learning) => learning.kind === 'tool')
      .map((learning) => `${learning.connector_name}, ${learning.category}: ${learning.content}`),
    activeRemediation: relevantLearnings.find((learning) => learning.kind === 'remediation')
      ?.content,
    connectorNames,
    script,
  });

  return [
    '## Investigation transcript',
    '',
    '### User',
    prompt.slice(0, MAX_TRANSCRIPT_CHARS),
    '',
    '### Investigator',
    response.slice(0, MAX_TRANSCRIPT_CHARS),
    '',
    turnPrompt,
  ].join('\n');
};
