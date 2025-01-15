/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Overall progress is a float from 0 to 1.
export const LOADED_FIELD_CANDIDATES = 0.2;
export const PROGRESS_STEP_P_VALUES = 0.5;
export const PROGRESS_STEP_GROUPING = 0.1;
export const PROGRESS_STEP_HISTOGRAMS = 0.1;
export const PROGRESS_STEP_HISTOGRAMS_GROUPS = 0.1;

// Don't use more than 10 here otherwise Kibana will emit an error
// regarding a limit of abort signal listeners of more than 10.
export const MAX_CONCURRENT_QUERIES = 10;
