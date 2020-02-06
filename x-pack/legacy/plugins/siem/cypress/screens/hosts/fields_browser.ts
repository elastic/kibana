/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** Clicking this button in the timeline opens the Fields browser */

/** The title displayed in the fields browser (i.e. Customize Columns) */
export const FIELDS_BROWSER_TITLE = '[data-test-subj="field-browser-title"]';

/** Contains the body of the fields browser */
export const FIELDS_BROWSER_CONTAINER = '[data-test-subj="fields-browser-container"]';

/** The title of the selected category in the right-hand side of the fields browser */
export const FIELDS_BROWSER_SELECTED_CATEGORY_TITLE = '[data-test-subj="selected-category-title"]';

export const FIELDS_BROWSER_CHECKBOX = (id: string) => {
  return `[data-test-subj="field-${id}-checkbox`;
};
