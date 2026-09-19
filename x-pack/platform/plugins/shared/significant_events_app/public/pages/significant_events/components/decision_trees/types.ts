/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionTreeDiff, LearningRecord } from '@kbn/nightshift-decision-trees';

/**
 * Client mirrors of the decision-tree route responses. Kept local, like the Cortex types, so the
 * app does not take a dependency on the nightshift_investigations plugin's server-side common.
 */

export const DECISION_TREE_STATUSES = ['established', 'tentative', 'archived'] as const;

export type DecisionTreeStatus = (typeof DECISION_TREE_STATUSES)[number];

export type DecisionTreeStatusFilter = 'all' | DecisionTreeStatus;

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
  markdown: string;
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
