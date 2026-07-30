/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Artifact type identifier for runbooks */
export const RUNBOOK_ARTIFACT_TYPE = 'runbook';

/** Artifact type identifier for linked dashboards */
export const DASHBOARD_ARTIFACT_TYPE = 'dashboard';

/** Default maximum length for a string field inside an artifact's `data` record. */
export const DEFAULT_ARTIFACT_DATA_FIELD_LIMIT = 1024;

/**
 * Type-specific length limits for individual fields of an artifact's `data`.
 *
 * To raise or add a limit for a new artifact type, add an entry here.
 * The framework schema resolves:
 * `ARTIFACT_DATA_FIELD_LIMITS[type]?.[field] ?? DEFAULT_ARTIFACT_DATA_FIELD_LIMIT`
 * for every string field, so no framework code changes are needed — only this map.
 */
export const ARTIFACT_DATA_FIELD_LIMITS: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  [RUNBOOK_ARTIFACT_TYPE]: { content: 50_000 },
};
