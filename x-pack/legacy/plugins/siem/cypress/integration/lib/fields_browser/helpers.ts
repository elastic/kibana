/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELDS_BROWSER_CONTAINER, FIELDS_BROWSER_FILTER_INPUT } from './selectors';
import {
  assertAtLeastOneEventMatchesSearch,
  executeKQL,
  hostExistsQuery,
  toggleTimelineVisibility,
} from '../timeline/helpers';
import { TIMELINE_DATA_PROVIDERS, TIMELINE_FIELDS_BUTTON } from '../timeline/selectors';

/** Opens the timeline's Field Browser */
export const openTimelineFieldsBrowser = () => {
  cy.get(TIMELINE_FIELDS_BUTTON).click({ force: true });

  cy.get(FIELDS_BROWSER_CONTAINER).should('exist');
};

/** Populates the timeline with a host from the hosts page */
export const populateTimeline = () => {
  toggleTimelineVisibility();

  executeKQL(hostExistsQuery);

  assertAtLeastOneEventMatchesSearch();
};

/** Clicks an arbitrary UI element that's not part of the fields browser (to dismiss it) */
export const clickOutsideFieldsBrowser = () => {
  cy.get(TIMELINE_DATA_PROVIDERS).click();
};

/** Filters the Field Browser by typing `fieldName` in the input */
export const filterFieldsBrowser = (fieldName: string) => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type(fieldName);
};

export const clearFieldsBrowser = () => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type('{selectall}{backspace}');
};
