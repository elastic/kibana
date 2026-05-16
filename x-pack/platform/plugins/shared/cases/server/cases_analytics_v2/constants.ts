/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Names of the Elasticsearch indices owned by cases-analytics v2. Cluster-
 * level (one index per surface, regardless of spaces or owners) and hidden
 * by default.
 *
 * - `.cases`             — current state of every case. `index.mode: lookup`
 *                          so downstream surfaces can `LOOKUP JOIN` from ES|QL.
 * - `.cases-activity`    — append-only audit of case events. Future PR.
 * - `.cases-attachments` — denormalized comments + attachments. Future PR.
 *
 * Index name mirrors the saved-object type (`cases` SO ↔ `.cases` index) so
 * an administrator reading `_cat/indices` can map back to the source data.
 */
export const CASE_INDEX_NAME = '.cases';

/**
 * Administrator route URLs. All under `/internal/cases/_analyticsV2/*` —
 * internal access only, superuser-gated. Not customer-facing; exist so
 * on-call can introspect state and recover from inconsistencies without
 * querying system indices by hand.
 */
export const CASES_ANALYTICS_V2_STATE_URL = '/internal/cases/_analyticsV2/state';
export const CASES_ANALYTICS_V2_RECONCILE_RUN_SOON_URL =
  '/internal/cases/_analyticsV2/reconcile/run_soon';
export const CASES_ANALYTICS_V2_RESET_URL = '/internal/cases/_analyticsV2/reset';
