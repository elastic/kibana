/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from '../../integration/lib/util/helpers';

import {
  TIMELINE_TOGGLE_BUTTON,
  SEARCH_OR_FILTER_CONTAINER,
  TIMELINE_FIELDS_BUTTON,
  SERVER_SIDE_EVENT_COUNT,
} from '../../screens/timeline/main';

export const hostExistsQuery = 'host.name: *';

export const openTimeline = () => {
  cy.get(TIMELINE_TOGGLE_BUTTON, { timeout: DEFAULT_TIMEOUT }).click();
};

export const populateTimeline = () => {
  cy.get(`${SEARCH_OR_FILTER_CONTAINER} input`).type(`${hostExistsQuery} {enter}`);
  cy.get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
    .invoke('text')
    .should('be.above', 0);
};

export const openTimelineFieldsBrowser = () => {
  cy.get(TIMELINE_FIELDS_BUTTON).click({ force: true });
};
