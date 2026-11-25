/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Deletes the `cases-observables` objects of deleted cases in the background. */
export const CASES_OBSERVABLES_DELETE_TASK_TYPE = 'cases_observables_delete';

/** Removes observables added twice at the same moment, once a day. */
export const CASES_OBSERVABLES_DEDUPE_TASK_TYPE = 'cases_observables_dedupe';
export const CASES_OBSERVABLES_DEDUPE_TASK_ID = `cases:${CASES_OBSERVABLES_DEDUPE_TASK_TYPE}`;

/**
 * How far before the previous run the next one looks back, so a write that started before the
 * previous run and finished after it is still checked.
 */
export const CASES_OBSERVABLES_DEDUPE_OVERLAP_MS = 60 * 60 * 1000;
