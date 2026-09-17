/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Headers required for every internal versioned route in this plugin. */
export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

// Route paths — kept here so the test tsconfig needs no dependency on the plugin package.
// Keep in sync with common/incidents/constants.ts.
export const LIST_INCIDENTS_PATH = 'internal/investigations/incidents';
export const CREATE_INCIDENT_PATH = 'internal/investigations/incidents';
export const INCIDENT_BY_ID_PATH = (id: string) => `internal/investigations/incidents/${id}`;
