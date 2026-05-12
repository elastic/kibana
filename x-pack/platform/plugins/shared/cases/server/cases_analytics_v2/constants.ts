/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Names of the Elasticsearch indices owned by cases-analytics v2. These are
 * cluster-level (one index per surface, regardless of how many spaces or owners
 * the tenant has) and hidden by default.
 *
 * - `.cases`             — current state of every case. `index.mode: lookup` so
 *                          downstream surfaces can `LOOKUP JOIN` it from ES|QL.
 * - `.cases-activity`    — append-only audit of case events. Added in PR 2.
 * - `.cases-attachments` — comments + attachments, denormalized. Added in PR 3.
 *
 * Mirroring the saved-object type names where possible — `cases` SO ↔ `.cases`
 * index — so an operator reading `_cat/indices` can map back to the source data
 * without a translation table.
 */
export const CASE_INDEX_NAME = '.cases';

/**
 * Operator route URLs. All under `/internal/cases/_analyticsV2/*` — internal
 * access only, superuser-gated. These are not customer-facing; they exist for
 * on-call to introspect state and recover from inconsistencies without
 * having to query system indices by hand.
 */
export const CASES_ANALYTICS_V2_STATE_URL = '/internal/cases/_analyticsV2/state';
export const CASES_ANALYTICS_V2_RECONCILE_RUN_SOON_URL =
  '/internal/cases/_analyticsV2/reconcile/run_soon';
export const CASES_ANALYTICS_V2_RESET_URL = '/internal/cases/_analyticsV2/reset';
