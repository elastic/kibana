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

/**
 * Default maximum length for a short string field in a built-in artifact's
 * `dataSchema` (e.g. a dashboard id). Unregistered types are never validated:
 * they pass through verbatim so a disabled or rolled-back plugin cannot fail
 * writes that were legal under the schema it once registered.
 */
export const DEFAULT_ARTIFACT_DATA_FIELD_LIMIT = 1024;

/** Maximum length for a runbook artifact's `data.content` field. */
export const RUNBOOK_CONTENT_LIMIT = 50_000;

/**
 * Framework ceiling for any single string in a registered `dataSchema`, checked
 * against `maxLength` at `registerArtifactType` time. Must be ≥
 * {@link RUNBOOK_CONTENT_LIMIT}.
 */
export const MAX_ARTIFACT_STRING_LENGTH = 65_536;

/** Framework ceiling for any array's `maxItems` in a registered `dataSchema`. */
export const MAX_ARTIFACT_ARRAY_ITEMS = 10;

/**
 * Ceiling for the worst-case `data` size implied by a registered `dataSchema`.
 *
 * "Bytes" is an approximation: the walk charges `maxLength` characters per
 * string, so JSON escaping of non-ASCII values can serialize larger. This is a
 * registration-time guardrail for schema authors, not an exact runtime cap.
 */
export const MAX_ARTIFACT_DATA_BYTES = MAX_ARTIFACT_STRING_LENGTH * 2;
