/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { RunBudgetGroupId } from '../../../common';

/**
 * Maps counted workflow IDs to budget groups for **soft** daily run quotas.
 *
 * Soft (v1, good enough for now): counts come from `.workflows-executions`
 * (server-side); `run_quota_enforce` pauses engines after the fact. Overshoot
 * until the next tick is expected. Harder admit-time limits are a follow-up via
 * Workflows execution rate-limits (security-team#18658 / #18661) — see
 * `docs/run_quotas.md`.
 *
 * A group must never span workflows that can be in a parent/child execution
 * relationship: one logical unit of work would otherwise consume the budget
 * several times over. Hence `ki_extraction` covers only the onboarding parent.
 * The four memory workflows are safe to share a counter because they are siblings.
 */
export const COUNTED_WORKFLOW_BUDGET_GROUPS = {
  [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: 'ki_extraction',
  [SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID]: 'detection',
  [SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID]: 'investigation',
} as const satisfies Record<string, RunBudgetGroupId>;

export type CountedWorkflowId = keyof typeof COUNTED_WORKFLOW_BUDGET_GROUPS;

export const COUNTED_WORKFLOW_IDS = Object.keys(
  COUNTED_WORKFLOW_BUDGET_GROUPS
) as readonly CountedWorkflowId[];

export const isCountedWorkflowId = (workflowId: string): workflowId is CountedWorkflowId =>
  workflowId in COUNTED_WORKFLOW_BUDGET_GROUPS;

/** The workflows sharing one counter, derived so the two views cannot drift. */
export const workflowIdsInBudgetGroup = (group: RunBudgetGroupId): CountedWorkflowId[] =>
  COUNTED_WORKFLOW_IDS.filter(
    (workflowId) => COUNTED_WORKFLOW_BUDGET_GROUPS[workflowId] === group
  );
