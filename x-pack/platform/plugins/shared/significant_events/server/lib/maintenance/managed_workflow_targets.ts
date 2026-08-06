/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { RunQuotaEngineId } from '../../../common/run_quotas/types';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';

/**
 * Single source of truth for managed workflow IDs used by installers and by
 * Pause/Resume. Installers install subsets (feature-flagged); maintenance
 * sweeps the union of everything that can run Significant Events background
 * activity.
 */

/** Global-scope workflows installed by `install_workflows` (always-on core set). */
export const GLOBAL_CORE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
] as const;

/**
 * Installed globally, but never disabled by pause: run-quota enforcement is the
 * control loop that pauses and resumes engines, so stopping it would strand
 * whatever state it left behind.
 */
export const ALWAYS_ON_WORKFLOW_IDS = [SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID] as const;

/** Memory workflows installed at the global scope when the memory flag is on. */
export const MEMORY_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
] as const;

/** Scheduled discovery workflows installed per space (`-${spaceId}` document suffix). */
export const SCHEDULED_MAINTENANCE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
] as const;

/** Workflows installed once at the global scope (`spaceId: '*'`). */
export const GLOBAL_MAINTENANCE_WORKFLOW_IDS = [
  ...GLOBAL_CORE_WORKFLOW_IDS,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  ...MEMORY_WORKFLOW_IDS,
  // Installed with the core set, but excluded from buildDisableTargets below.
  ...ALWAYS_ON_WORKFLOW_IDS,
] as const;

/** Workflows installed in the default space (continuous onboarding, KI sync, legacy). */
export const DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
] as const;

/**
 * Every workflow id that installers may create. Used by the drift test so a
 * new install target cannot land without also joining the maintenance sweep.
 */
export const ALL_INSTALLABLE_WORKFLOW_IDS = [
  ...GLOBAL_CORE_WORKFLOW_IDS,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  ...MEMORY_WORKFLOW_IDS,
  ...SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
  ...ALWAYS_ON_WORKFLOW_IDS,
] as const;

export interface MaintenanceWorkflowTarget {
  /** Workflow saved-object document id (matches the persisted `disabledWorkflows[].id`). */
  id: string;
  spaceId: string;
}

const isAlwaysOnWorkflow = (id: string): boolean =>
  (ALWAYS_ON_WORKFLOW_IDS as readonly string[]).includes(id);

/** Targets whose `enabled` flag is toggled by pause/resume. */
export const buildDisableTargets = (spaceIds: string[]): MaintenanceWorkflowTarget[] => [
  ...GLOBAL_MAINTENANCE_WORKFLOW_IDS.filter((id) => !isAlwaysOnWorkflow(id)).map((id) => ({
    id,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  })),
  ...DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS.map((id) => ({
    id,
    spaceId: DEFAULT_SPACE_ID,
  })),
  ...spaceIds.flatMap((spaceId) =>
    SCHEDULED_MAINTENANCE_WORKFLOW_IDS.map((baseId) => ({
      id: `${baseId}-${spaceId}`,
      spaceId,
    }))
  ),
];

/**
 * Targets whose in-flight executions are cancelled on pause.
 * Global workflow *documents* live in `*`, but executions run in the triggering
 * space, so cancellation sweeps every space for those ids.
 */
export const buildCancelTargets = (spaceIds: string[]): MaintenanceWorkflowTarget[] => [
  ...spaceIds.flatMap((spaceId) =>
    GLOBAL_MAINTENANCE_WORKFLOW_IDS.filter((id) => !isAlwaysOnWorkflow(id)).map((id) => ({
      id,
      spaceId,
    }))
  ),
  ...DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS.map((id) => ({
    id,
    spaceId: DEFAULT_SPACE_ID,
  })),
  ...spaceIds.flatMap((spaceId) =>
    SCHEDULED_MAINTENANCE_WORKFLOW_IDS.map((baseId) => ({
      id: `${baseId}-${spaceId}`,
      spaceId,
    }))
  ),
];

/**
 * Per-engine automation disable targets for engine-scoped pause.
 *
 * These stop *automation only* — the workflows listed here are scheduled or
 * continuous triggers, not user-callable leaves. Human-initiated workflows
 * (e.g. ki-onboarding leaf, memory-synthesis, investigation) are deliberately
 * excluded so manual runs always remain available.
 *
 * | Engine        | Stopped automation                                        |
 * |---------------|-----------------------------------------------------------|
 * | context       | continuous-onboarding, ki-sync, legacy-continuous-KI,     |
 * |               | memory-consolidation, conversation-scraper, gap-detection |
 * | detection     | orchestrator, scheduled-detection-*, scheduled-review-*   |
 * | investigation | nothing — see below                                       |
 */
export const buildEngineDisableTargets = (
  engine: RunQuotaEngineId,
  spaceIds: string[]
): MaintenanceWorkflowTarget[] => {
  switch (engine) {
    case 'context':
      return [
        // Default-space automation workflows
        { id: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, spaceId: DEFAULT_SPACE_ID },
        { id: SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, spaceId: DEFAULT_SPACE_ID },
        { id: LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID, spaceId: DEFAULT_SPACE_ID },
        // Global-scope memory automation (NOT memory synthesis — user-triggered)
        {
          id: SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        },
        {
          id: SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        },
        {
          id: SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        },
      ];

    case 'detection':
      return [
        // Orchestrator drives detection; discovery is kept so "run now" still works
        { id: SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
        // Per-space scheduled workflows
        ...spaceIds.flatMap((spaceId) => [
          { id: `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-${spaceId}`, spaceId },
          { id: `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-${spaceId}`, spaceId },
        ]),
      ];

    case 'investigation':
      // Investigations have no scheduled trigger of their own: they are fanned out
      // by discovery, so pausing `detection` is what stops them. Disabling the
      // investigation workflow itself would also break the manual "investigate"
      // button, so an exhausted investigation budget overshoots until the detection
      // side stops feeding it. Native Workflows rate-limits are the real fix
      // (security-team#18658 / #18661) — see `docs/run_quotas.md`.
      return [];
  }
};

/**
 * Build engine disable targets for a set of engines. Order within each engine
 * group is preserved; engines are processed in the order given.
 */
export const buildEngineDisableTargetsForEngines = (
  engines: readonly RunQuotaEngineId[],
  spaceIds: string[]
): MaintenanceWorkflowTarget[] =>
  engines.flatMap((engine) => buildEngineDisableTargets(engine, spaceIds));
