/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionTreeDiff, LearningRecord } from '@kbn/nightshift-decision-trees';
import type { CortexEntityType, CortexPageStatus } from './cortex';

/**
 * Decision trees live alongside the rest of the Cortex wiki as runbook pages, so they are
 * searchable and browsable with everything else the investigator already reads.
 */
export const DECISION_TREE_ENTITY_TYPE: CortexEntityType = 'runbook';

/**
 * Marks a runbook page as a decision tree.
 *
 * Two independent writers share the Cortex index: the Cortex optimizer, which proposes free-form
 * wiki edits, and the reinforcement agent, which owns decision trees. The prefix is what lets the
 * optimizer leave these pages alone instead of rewriting a Mermaid tree it does not understand.
 */
export const DECISION_TREE_SLUG_PREFIX = 'decision-tree-';

/** Marks a page as one of the reinforcement agent's single-slot learning records. */
export const LEARNING_SLUG_PREFIX = 'learning-';

export const isDecisionTreeSlug = (slug: string): boolean =>
  slug.startsWith(DECISION_TREE_SLUG_PREFIX) && slug.length > DECISION_TREE_SLUG_PREFIX.length;

export const isLearningSlug = (slug: string): boolean =>
  slug.startsWith(LEARNING_SLUG_PREFIX) && slug.length > LEARNING_SLUG_PREFIX.length;

/**
 * True for pages the reinforcement agent owns end to end.
 *
 * These carry validated structure (a Mermaid tree, or a one-slot learning capped at four lines),
 * so the Cortex optimizer must not rewrite them through its free-form edit path.
 */
export const isReinforcementOwnedSlug = (slug: string): boolean =>
  isDecisionTreeSlug(slug) || isLearningSlug(slug);

/**
 * Dedicated Context Engine AI index for decision trees and their learnings.
 *
 * Trees used to live in the Cortex index as runbook pages; they now own this index so the UI can
 * browse version history and per-version diffs without those documents polluting the Cortex wiki.
 */
export const DECISION_TREE_AI_INDEX_ID = 'nightshift-decision-trees';

/** Backing index for {@link DECISION_TREE_AI_INDEX_ID}. Must use the `ai-index-idx-` prefix. */
export const DECISION_TREE_AI_INDEX_DEST = 'ai-index-idx-nightshift-decision-trees';

/** Tag every document in the index carries, so a single term query lists the whole index. */
export const DECISION_TREE_TAG = 'decision-tree';

/**
 * The three document types the index holds, discriminated by `type`:
 * - `decision_tree`      one head document per tree, holding the current markdown
 * - `decision_tree_version` an append-only commit, one per reinforcement turn
 * - `decision_tree_learning` a single-slot learning record
 */
export const DECISION_TREE_DOC_TYPES = [
  'decision_tree',
  'decision_tree_version',
  'decision_tree_learning',
] as const;

export type DecisionTreeDocType = (typeof DECISION_TREE_DOC_TYPES)[number];

/** Reused from Cortex so tentative/established/archived keep one meaning across Nightshift. */
export type DecisionTreeStatus = CortexPageStatus;

export interface DecisionTreeSummary {
  tree_id: string;
  symptom: string;
  title: string;
  status: DecisionTreeStatus;
  version: number;
  node_count: number;
  edge_count: number;
  learning_count: number;
  updated_at: string;
}

export interface DecisionTreeDetail extends DecisionTreeSummary {
  /** The full markdown file as the agent last wrote it. */
  markdown: string;
  /** The Mermaid block pulled out of {@link markdown}, fences included. */
  mermaid: string;
  learnings: LearningRecord[];
}

export interface DecisionTreeVersionSummary {
  version: number;
  author: string;
  summary: string;
  reinforced: boolean;
  node_count: number;
  edge_count: number;
  learning_count: number;
  created_at: string;
}

export interface DecisionTreeVersionDetail extends DecisionTreeVersionSummary {
  tree_id: string;
  markdown: string;
  mermaid: string;
  learnings: LearningRecord[];
  /** Against the previous version. Absent for v1, which has no predecessor. */
  diff?: DecisionTreeDiff;
}

export interface DecisionTreeStats {
  total: number;
  established: number;
  total_versions: number;
  last_updated?: string;
}

export interface ListDecisionTreesResponse {
  trees: DecisionTreeSummary[];
  stats: DecisionTreeStats;
}

export interface GetDecisionTreeResponse {
  tree: DecisionTreeDetail;
}

export interface ListDecisionTreeVersionsResponse {
  tree_id: string;
  versions: DecisionTreeVersionSummary[];
}

export interface GetDecisionTreeVersionResponse {
  version: DecisionTreeVersionDetail;
}

export interface GetDecisionTreesAvailabilityResponse {
  enabled: boolean;
}
