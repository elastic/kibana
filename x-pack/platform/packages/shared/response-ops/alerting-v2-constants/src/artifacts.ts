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

/** Maximum length for a runbook artifact's `data.content` field. */
export const RUNBOOK_CONTENT_LIMIT = 50_000;
