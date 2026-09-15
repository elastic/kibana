/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DECISION_NODE_TYPES = ['symptom', 'evidence_gatherer', 'decision', 'end'] as const;

export type DecisionNodeType = (typeof DECISION_NODE_TYPES)[number];

export interface DecisionNodeView {
  node_id: string;
  node_type: DecisionNodeType;
  label: string;
  node_metadata?: { description: string };
}

export interface DecisionEdgeView {
  source_node_id: string;
  target_node_id: string;
  condition: string;
  is_taken: boolean;
}

export interface DecisionTreeView {
  tree_id: string;
  nodes: DecisionNodeView[];
  edges: DecisionEdgeView[];
}

/**
 * Which phase of the investigation lifecycle a reinforcement turn belongs to.
 * Combined with `causalConfirmed`, this selects the turn script the agent runs.
 */
export const DECISION_TREE_TURN_KINDS = [
  'initial_investigation',
  'feedback_reinforcement',
] as const;

export type DecisionTreeTurnKind = (typeof DECISION_TREE_TURN_KINDS)[number];

export const SYSTEM_LEARNING_CATEGORIES = [
  'architecture',
  'dependency',
  'relationship',
  'runtime_behavior',
  'data_flow',
  'ownership',
  'invariant',
] as const;

export type SystemLearningCategory = (typeof SYSTEM_LEARNING_CATEGORIES)[number];

export const TOOL_LEARNING_CATEGORIES = [
  'error',
  'capability',
  'limitation',
  'usage_pattern',
  'tool_selection',
  'query_pattern',
  'docs_gap',
] as const;

export type ToolLearningCategory = (typeof TOOL_LEARNING_CATEGORIES)[number];

export const LEARNING_KINDS = ['system', 'tool', 'remediation'] as const;

export type LearningKind = (typeof LEARNING_KINDS)[number];

export interface LearningRecord {
  kind: LearningKind;
  content: string;
  /** Category for system and tool learnings. Remediations carry none. */
  category?: SystemLearningCategory | ToolLearningCategory;
  /** Connector the learning applies to. Tool learnings only. */
  connector_name?: string;
  keywords: string[];
}

/** One decision-tree file the agent edited and is asking to have persisted. */
export interface DecisionTreeUpdateSubmission {
  tree_id: string;
  file_path: string;
  evidence_gatherer_metadata: string[];
}
