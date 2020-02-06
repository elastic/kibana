/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { drag, drop } from '../../integration/lib/drag_n_drop/helpers';

import {
  FIELDS_BROWSER_FILTER_INPUT,
  FIELDS_BROWSER_MESSAGE_CHECKBOX,
  FIELDS_BROWSER_HOST_GEO_CITY_NAME_CHECKBOX,
  FIELDS_BROWSER_DRAGGABLE_HOST_GEO_COUNTRY_NAME_HEADER,
  FIELDS_BROWSER_HEADER_DROP_AREA,
  FIELDS_BROWSER_HOST_GEO_CONTINENT_NAME_CHECKBOX,
  FIELDS_BROWSER_RESET_FIELDS,
} from '../../screens/timeline/fields_browser';
import { DEFAULT_TIMEOUT } from '../../integration/lib/util/helpers';
import { KQL_SEARCH_BAR } from '../../screens/hosts/main';

export const clearFieldsBrowser = () => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type('{selectall}{backspace}');
};

export const filterFieldsBrowser = (fieldName: string) => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT)
    .type(fieldName)
    .should('not.have.class', 'euiFieldSearch-isLoading');
};

export const closeFieldsBrowser = () => {
  cy.get(KQL_SEARCH_BAR, { timeout: DEFAULT_TIMEOUT }).click({ force: true });
};

export const removesMessageField = () => {
  cy.get(FIELDS_BROWSER_MESSAGE_CHECKBOX).uncheck({
    force: true,
  });
};

export const addsHostGeoCityNameToTimeline = () => {
  cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_CHECKBOX).check({
    force: true,
  });
};

export const addsHostGeoCountryNameToTimelineDraggingIt = () => {
  cy.get(FIELDS_BROWSER_DRAGGABLE_HOST_GEO_COUNTRY_NAME_HEADER).should('exist');
  cy.get(FIELDS_BROWSER_DRAGGABLE_HOST_GEO_COUNTRY_NAME_HEADER).then(field => drag(field));

  cy.get(FIELDS_BROWSER_HEADER_DROP_AREA).then(headersDropArea => drop(headersDropArea));
};

export const addsHostGeoContinentNameToTimeline = () => {
  cy.get(FIELDS_BROWSER_HOST_GEO_CONTINENT_NAME_CHECKBOX).check({
    force: true,
  });
};

export const resetFields = () => {
  cy.get(FIELDS_BROWSER_RESET_FIELDS).click({ force: true });
};
