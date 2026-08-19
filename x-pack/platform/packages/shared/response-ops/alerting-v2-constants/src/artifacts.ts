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
 * Maximum length for a field inside the `data` of an artifact whose type nobody
 * registered. A registered type declares its own limits in its `dataSchema`.
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
export const MAX_ARTIFACT_ARRAY_ITEMS = 1_000;

/**
 * Ceiling for the worst-case `data` size implied by a registered `dataSchema`,
 * checked at `registerArtifactType` time. Strictly greater than
 * {@link MAX_ARTIFACT_STRING_LENGTH} so a schema may declare a single max-length
 * string alongside the key names and punctuation that surround it.
 */
export const MAX_ARTIFACT_DATA_BYTES = 131_072;
