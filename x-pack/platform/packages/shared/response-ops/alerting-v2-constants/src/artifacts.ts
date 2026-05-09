/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Artifact type identifier for runbooks */
export const RUNBOOK_ARTIFACT_TYPE = 'runbook';

/** Default maximum character length for artifact values (applies when no type-specific override exists) */
export const DEFAULT_ARTIFACT_VALUE_LIMIT = 1024;

/**
 * Type-specific artifact value length limits.
 *
 * To raise or add a limit for a new artifact type, add an entry here.
 * The framework schema resolves: `ARTIFACT_VALUE_LIMITS[type] ?? DEFAULT_ARTIFACT_VALUE_LIMIT`.
 * No framework code changes are needed — only this map.
 */
export const ARTIFACT_VALUE_LIMITS: Readonly<Record<string, number>> = {
  [RUNBOOK_ARTIFACT_TYPE]: 50_000,
};

/** The highest value in ARTIFACT_VALUE_LIMITS (used as the Zod base .max()) */
export const MAX_ARTIFACT_VALUE_LIMIT = Math.max(
  DEFAULT_ARTIFACT_VALUE_LIMIT,
  ...Object.values(ARTIFACT_VALUE_LIMITS)
);
