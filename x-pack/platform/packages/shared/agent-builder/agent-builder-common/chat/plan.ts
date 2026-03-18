/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent execution mode.
 * - `agent`: Standard execution mode (tools, reasoning, answering).
 * - `planning`: Plan creation and refinement mode (no execution tools).
 */
export type AgentMode = 'agent' | 'planning';

export const DEFAULT_AGENT_MODE: AgentMode = 'agent';

/**
 * Lifecycle status of a plan.
 * - `draft`: Plan is still being refined in planning mode.
 * - `ready`: Plan is finalized and ready for execution.
 */
export type PlanStatus = 'draft' | 'ready';

/**
 * Tracks who initiated the plan — determines the approval flow.
 * - `planning`: User explicitly entered planning mode → plan requires approval.
 * - `agent`: Agent self-planned in agent mode → no approval needed.
 */
export type PlanSource = 'planning' | 'agent';

/**
 * Granular status for individual action items within a plan.
 */
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PlanActionItem {
  /** Description of the action item */
  description: string;
  /** Granular status of this item */
  status: ActionItemStatus;
  /** Skill IDs this step relies on (e.g. ['alert_triage']) */
  related_skills?: string[];
  /** Tool IDs this step relies on (e.g. ['platform.search', 'esql']) */
  related_tools?: string[];
}

export interface Plan {
  /** Short title summarizing the plan */
  title: string;
  /** Optional longer description of the plan's approach */
  description?: string;
  /** Ordered list of action items */
  action_items: PlanActionItem[];
  /** Lifecycle status: draft (still refining) or ready (approved for execution) */
  status: PlanStatus;
  /** Who initiated the plan: 'planning' (user-initiated) or 'agent' (self-planned) */
  source: PlanSource;
}
