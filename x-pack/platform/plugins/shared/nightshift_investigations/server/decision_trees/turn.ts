/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTurnPrompt, selectTurnScript } from '@kbn/nightshift-decision-trees';
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
 * Decides whether this round seeds the tree or builds on it.
 *
 * The post-execution hook carries no round index, so the tree's own visit history stands in for
 * it: a tree nobody has reinforced yet is still being established, and once one has been visited
 * later rounds are follow-ups that either reinforce a confirmed path or extend the tree.
 */
export const deriveTurnKind = (trees: DecisionTreeSummary[]): DecisionTreeTurnKind =>
  trees.some((tree) => tree.corroborations > 0)
    ? 'feedback_reinforcement'
    : 'initial_investigation';

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
    hasExistingTrees: trees.length > 0,
  });

  const turnPrompt = buildTurnPrompt({
    editableTreePaths: trees.map(
      (tree) => `${tree.tree_id} — ${workspacePathForTree(tree.tree_id)}`
    ),
    activeSystemLearning: learnings.find((learning) => learning.kind === 'system')?.content,
    activeToolLearnings: learnings
      .filter((learning) => learning.kind === 'tool')
      .map((learning) => `${learning.connector_name}, ${learning.category}: ${learning.content}`),
    activeRemediation: learnings.find((learning) => learning.kind === 'remediation')?.content,
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
