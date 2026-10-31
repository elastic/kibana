/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASES_OBSERVABLES_SYNC_TASK_TYPE = 'cases_observables_sync';
export const CASES_OBSERVABLES_SYNC_TASK_ID = `cases:${CASES_OBSERVABLES_SYNC_TASK_TYPE}`;

/**
 * The version of the full pass this release runs. A node that has seen a completed pass at its own
 * pass version knows the observables index matches the case field; a higher version starts a new
 * full pass.
 */
export const OBSERVABLES_SYNC_PASS_VERSION = 1;
