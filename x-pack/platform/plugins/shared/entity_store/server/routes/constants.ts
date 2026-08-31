/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import { HistorySnapshotState, LogExtractionConfig } from '../domain/saved_objects';

export const DEFAULT_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ['securitySolution'],
};

// Matches the requiredPrivileges declared by the Security Solution asset criticality HTTP routes
// (e.g. `.../asset_criticality/routes/upsert.ts`), so callers that bypass Kibana's route-level
// authorization (a synthetic/fake request) can enforce the same Kibana feature privilege.
export const ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES = [
  'securitySolution',
  'securitySolution-entity-analytics',
];

export const RESOLUTION_ENTITY_STORE_PERMISSIONS: AuthzEnabled = {
  requiredPrivileges: ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES,
};

export type LogExtractionInstallParams = z.infer<typeof LogExtractionInstallParams>;
// timeout: intentionally excluded from LogExtractionBodyParams
// TODO: add timeout once we have a way to set it as a task override param
export const LogExtractionInstallParams = LogExtractionConfig.pick({
  fieldHistoryLength: true,
  additionalIndexPatterns: true,
  excludedIndexPatterns: true,
  lookbackPeriod: true,
  frequency: true,
  delay: true,
  docsLimit: true,
  maxLogsPerPage: true,
  maxTimeWindowSize: true,
  maxLogsPerWindow: true,
  maxLogsPerWindowCapBehavior: true,
}).partial();

/**
 * Update body uses the same bounded fields as install (all optional). Defined via the shared
 * LogExtractionConfig pick so route validation stays in sync with SO/config limits.
 */
export type LogExtractionUpdateParams = LogExtractionInstallParams;
export const LogExtractionUpdateParams = LogExtractionInstallParams;

export type LogExtractionBodyParams = LogExtractionInstallParams | LogExtractionUpdateParams;

export type HistorySnapshotBodyParams = z.infer<typeof HistorySnapshotBodyParams>;
export const HistorySnapshotBodyParams = HistorySnapshotState.pick({
  frequency: true,
}).partial();
