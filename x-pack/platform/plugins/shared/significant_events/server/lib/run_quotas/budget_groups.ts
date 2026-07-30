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
import type { SignificantEventsRunQuotaTemplateValues } from '@kbn/workflows/managed';
import type { RunBudgetGroupId, RunQuotaSettings } from '../../../common';

/**
 * The budget group each gated workflow stamps. Every workflow listed here
 * carries the run-quota gate preamble in its YAML and is installed with the
 * quota template values; every workflow carrying that preamble is listed here
 * (asserted by `run_quota_gate.test.ts`).
 *
 * A group must never span workflows that can be in a parent/child execution
 * relationship: a child gates and records itself exactly as a parent does, so
 * one logical unit of work would otherwise consume the budget several times
 * over. Hence `ki_extraction` covers only the onboarding parent, not the
 * features identification and query generation workflows it invokes. The four
 * memory workflows are safe to share a counter because they are siblings.
 */
export const GATED_WORKFLOW_BUDGET_GROUPS = {
  [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: 'ki_extraction',
  [SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID]: 'memory',
  [SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID]: 'detection',
  [SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID]: 'investigation',
} as const satisfies Record<string, RunBudgetGroupId>;

export type GatedWorkflowId = keyof typeof GATED_WORKFLOW_BUDGET_GROUPS;

export const GATED_WORKFLOW_IDS = Object.keys(
  GATED_WORKFLOW_BUDGET_GROUPS
) as readonly GatedWorkflowId[];

export const isGatedWorkflowId = (workflowId: string): workflowId is GatedWorkflowId =>
  workflowId in GATED_WORKFLOW_BUDGET_GROUPS;

/** The workflows sharing one counter, derived so the two views cannot drift. */
export const workflowIdsInBudgetGroup = (group: RunBudgetGroupId): GatedWorkflowId[] =>
  GATED_WORKFLOW_IDS.filter((workflowId) => GATED_WORKFLOW_BUDGET_GROUPS[workflowId] === group);

/**
 * The values baked into a gated workflow's YAML at install time. Limits cannot
 * be read at run time (workflow steps have no access to saved objects), so a
 * limit change takes effect by reinstalling the workflows that use it.
 */
export const runQuotaValuesFor = (
  settings: RunQuotaSettings,
  workflowId: GatedWorkflowId
): SignificantEventsRunQuotaTemplateValues => {
  const { enabled, max } = settings.limits[GATED_WORKFLOW_BUDGET_GROUPS[workflowId]];
  return {
    runQuotaEnabled: enabled,
    runDailyLimit: max,
    runQuotaTimeZone: settings.timezone,
  };
};
