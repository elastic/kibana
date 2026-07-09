/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GCS bucket that stores nightshift incident snapshots. Also used as the ES
 * snapshot repository name — the repository is just a local handle over this
 * bucket (re-registered per run at the incident's base path), so a separate repo
 * identifier would only duplicate this value.
 */
export const NIGHTSHIFT_INCIDENT_BUCKET = 'nightshift-incident-snapshots';

/**
 * Environment variable that supplies the read-only source (Overview) API key used
 * to authenticate the remote reindex. Preferred over an inline `source.apiKey` so
 * real credentials never live in a committed config file.
 */
export const OVERVIEW_API_KEY_ENV = 'OVERVIEW_API_KEY';
