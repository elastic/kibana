/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** Clicking this button in the timeline opens the Fields browser */
export const TIMELINE_FIELDS_BUTTON =
  '[data-test-subj="timeline"] [data-test-subj="show-field-browser"]';

/** The title displayed in the fields browser (i.e. Customize Columns) */
export const FIELDS_BROWSER_TITLE = '[data-test-subj="field-browser-title"]';

/** Contains the body of the fields browser */
export const FIELDS_BROWSER_CONTAINER = '[data-test-subj="fields-browser-container"]';

/** The title of the selected category in the right-hand side of the fields browser */
export const FIELDS_BROWSER_SELECTED_CATEGORY_TITLE = '[data-test-subj="selected-category-title"]';

/** A count of the fields in the selected category in the right-hand side of the fields browser */
export const FIELDS_BROWSER_SELECTED_CATEGORY_COUNT =
  '[data-test-subj="selected-category-count-badge"]';

/** Typing in this input filters the Field Browser */
export const FIELDS_BROWSER_FILTER_INPUT = '[data-test-subj="field-search"]';

/**
 * This label displays a count of the categories containing (one or more)
 * fields that match the filter criteria
 */
export const FIELDS_BROWSER_CATEGORIES_COUNT = '[data-test-subj="categories-count"]';

export const FIELDS_BROWSER_HOST_CATEGORIES_COUNT = '[data-test-subj="host-category-count"]';

export const FIELDS_BROWSER_SYSTEM_CATEGORIES_COUNT = '[data-test-subj="system-category-count"]';

/**
 * This label displays a count of the fields that match the filter criteria
 */
export const FIELDS_BROWSER_FIELDS_COUNT = '[data-test-subj="fields-count"]';
