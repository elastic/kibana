/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from '../../integration/lib/util/helpers';
import {
  EVENTS_VIEWER_FIELDS_BUTTON,
  CLOSE_MODAL,
  INSPECT_QUERY,
  SERVER_SIDE_EVENT_COUNT,
  HOST_GEO_CITY_NAME_CHECKBOX,
  HOST_GEO_COUNTRY_NAME_CHECKBOX,
  FIELDS_BROWSER_CONTAINER,
  RESET_FIELDS,
  LOAD_MORE,
} from '../../screens/hosts/events';

export const closeModal = () => {
  cy.get(CLOSE_MODAL, { timeout: DEFAULT_TIMEOUT }).click();
};

export const opensInspectQueryModal = () => {
  cy.get(INSPECT_QUERY, { timeout: DEFAULT_TIMEOUT })
    .should('exist')
    .trigger('mousemove', { force: true })
    .click({ force: true });
};

export const waitsForEventsToBeLoaded = () => {
  cy.get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
    .should('exist')
    .invoke('text', { timeout: DEFAULT_TIMEOUT })
    .should('not.equal', '0');
};

export const addsHostGeoCityNameToHeader = () => {
  cy.get(HOST_GEO_CITY_NAME_CHECKBOX).check({
    force: true,
  });
};

export const addsHostGeoCountryNameToHeader = () => {
  cy.get(HOST_GEO_COUNTRY_NAME_CHECKBOX).check({
    force: true,
  });
};

export const resetFields = () => {
  cy.get(RESET_FIELDS).click({ force: true });
};

export const openEventsViewerFieldsBrowser = () => {
  cy.get(EVENTS_VIEWER_FIELDS_BUTTON, { timeout: DEFAULT_TIMEOUT }).click({ force: true });

  cy.get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
    .invoke('text')
    .should('not.equal', '0');

  cy.get(FIELDS_BROWSER_CONTAINER).should('exist');
};

export const loadMoreEvents = () => {
  cy.get(LOAD_MORE).click({ force: true });
};
