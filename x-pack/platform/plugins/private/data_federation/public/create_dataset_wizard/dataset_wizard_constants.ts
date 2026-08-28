/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOGISTICS_STEP = 1;
export const ADDITIONAL_SETTINGS_STEP = 2;
export const SCHEMA_MAPPINGS_STEP = 3;
/** Flow 3 only. Same URL index as Review in flows 1 and 2. */
export const PREVIEW_RESULTS_STEP = 4;
/** Review in flows 1 and 2. */
export const REVIEW_STEP = 4;
/** Review in flow 3, after Preview results. */
export const FLOW_3_REVIEW_STEP = 5;
/**
 * Flow 4 only, between File and Additional settings. Step order comes from
 * `getWizardSteps`, so this id does not have to sort between the two.
 */
export const DATA_SOURCE_STEP = 6;

export const DATASET_WIZARD_FORM_MAX_WIDTH = 850;
