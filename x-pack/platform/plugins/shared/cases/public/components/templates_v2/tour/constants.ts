/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TEMPLATES_TOUR_STEP_TEST_ID = 'cases-templates-tour-step';

/** CSS selectors for the tour step anchors, matching the app header menu item `data-test-subj`s. */
export const TEMPLATES_TOUR_ANCHORS = {
  create: '[data-test-subj="create-template-button"]',
  fieldLibrary: '[data-test-subj="field-library-button"]',
} as const;
