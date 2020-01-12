/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { drag, drop } from '../drag_n_drop/helpers';
import { ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS } from '../hosts/selectors';
import {
  CLOSE_TIMELINE_BTN,
  CREATE_NEW_TIMELINE,
  SEARCH_OR_FILTER_CONTAINER,
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_DATA_PROVIDERS,
  TIMELINE_SETTINGS,
  TIMELINE_TOGGLE_BUTTON,
  TOGGLE_TIMELINE_EXPAND_EVENT,
} from './selectors';
import { DEFAULT_TIMEOUT } from '../util/helpers';

/** Toggles the timeline's open / closed state by clicking the `T I M E L I N E` button */
export const toggleTimelineVisibility = () =>
  cy.get(TIMELINE_TOGGLE_BUTTON, { timeout: DEFAULT_TIMEOUT }).click();

export const createNewTimeline = () => {
  cy.get(TIMELINE_SETTINGS).click();
  cy.get(CREATE_NEW_TIMELINE).click();
  cy.get(CLOSE_TIMELINE_BTN).click({ force: true });
};

/** Drags and drops a host from the `All Hosts` widget on the `Hosts` page to the timeline */
export const dragFromAllHostsToTimeline = () => {
  cy.get(ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS)
    .first()
    .then(host => drag(host));
  cy.get(TIMELINE_DATA_PROVIDERS).then(dataProvidersDropArea => drop(dataProvidersDropArea));
};

/** Executes the specified KQL query in the timeline */
export const executeKQL = (query: string) => {
  cy.get(`${SEARCH_OR_FILTER_CONTAINER} input`).type(`${query} {enter}`);
};

/** A sample KQL query that finds any documents where the `host.name` field exists */
export const hostExistsQuery = 'host.name: *';

/** Asserts that at least one event matches the timeline's search criteria */
export const assertAtLeastOneEventMatchesSearch = () =>
  cy
    .get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
    .invoke('text')
    .should('be.above', 0);

/** Toggles open or closed the first event in the timeline */
export const toggleFirstTimelineEventDetails = () => {
  cy.get(TOGGLE_TIMELINE_EXPAND_EVENT, { timeout: DEFAULT_TIMEOUT })
    .first()
    .click({ force: true });
};
