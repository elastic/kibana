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
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';

/**
 * Single source of truth for which managed workflows Pause/Resume sweep.
 * Installers may install a subset (feature-flagged); this list is the union of
 * everything that can run Significant Events background activity.
 */

/** Workflows installed once at the global scope (`spaceId: '*'`). */
export const GLOBAL_MAINTENANCE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
] as const;

/** Workflows installed in the default space (continuous onboarding, memory, legacy). */
export const DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID,
  LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
] as const;

/** Scheduled discovery workflows installed per space with a `-${spaceId}` document suffix. */
export const SCHEDULED_MAINTENANCE_WORKFLOW_IDS = [
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
] as const;

export interface MaintenanceWorkflowTarget {
  documentId: string;
  spaceId: string;
}

/** Targets whose `enabled` flag is toggled by pause/resume. */
export const buildDisableTargets = (spaceIds: string[]): MaintenanceWorkflowTarget[] => [
  ...GLOBAL_MAINTENANCE_WORKFLOW_IDS.map((documentId) => ({
    documentId,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  })),
  ...DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS.map((documentId) => ({
    documentId,
    spaceId: DEFAULT_SPACE_ID,
  })),
  ...spaceIds.flatMap((spaceId) =>
    SCHEDULED_MAINTENANCE_WORKFLOW_IDS.map((id) => ({
      documentId: `${id}-${spaceId}`,
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
    GLOBAL_MAINTENANCE_WORKFLOW_IDS.map((documentId) => ({ documentId, spaceId }))
  ),
  ...DEFAULT_SPACE_MAINTENANCE_WORKFLOW_IDS.map((documentId) => ({
    documentId,
    spaceId: DEFAULT_SPACE_ID,
  })),
  ...spaceIds.flatMap((spaceId) =>
    SCHEDULED_MAINTENANCE_WORKFLOW_IDS.map((id) => ({
      documentId: `${id}-${spaceId}`,
      spaceId,
    }))
  ),
];
