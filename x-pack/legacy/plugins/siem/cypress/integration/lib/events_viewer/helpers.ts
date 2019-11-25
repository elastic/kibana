/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EVENTS_VIEWER_FIELDS_BUTTON, KQL_SEARCH_BAR } from './selectors';
import { FIELDS_BROWSER_CONTAINER } from '../fields_browser/selectors';
import { SERVER_SIDE_EVENT_COUNT } from '../timeline/selectors';
import { DEFAULT_TIMEOUT } from '../util/helpers';

/** Opens the eventsViewer Field Browser */
export const openEventsViewerFieldsBrowser = () => {
  cy.get(EVENTS_VIEWER_FIELDS_BUTTON, { timeout: DEFAULT_TIMEOUT }).click({ force: true });

  cy.get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
    .invoke('text')
    .should('not.equal', '0');

  cy.get(FIELDS_BROWSER_CONTAINER).should('exist');
};

/** Clicks an arbitrary UI element that's not part of the fields browser (to dismiss it) */
export const clickOutsideFieldsBrowser = () => {
  cy.get(KQL_SEARCH_BAR, { timeout: DEFAULT_TIMEOUT }).click();
};

/** Filters the search bar at the top of most pages with the specified KQL */
export const filterSearchBar = (kql: string) => {
  cy.get(KQL_SEARCH_BAR).type(`${kql} {enter}`);
};
