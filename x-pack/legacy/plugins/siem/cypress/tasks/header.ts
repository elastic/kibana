/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from '../tasks/login';
import { KQL_INPUT, REFRESH_BUTTON } from '../screens/header';

export const navigateFromHeaderTo = (page: string) => {
  cy.get(page).click({ force: true });
};

export const clearSearchBar = () => {
  cy.get(KQL_INPUT, { timeout: DEFAULT_TIMEOUT })
    .clear()
    .type('{enter}');
};

export const refreshPage = () => {
  cy.get(REFRESH_BUTTON)
    .click({ force: true })
    .invoke('text', { timeout: DEFAULT_TIMEOUT })
    .should('not.equal', 'Updating');
};

export const kqlSearch = (search: string) => {
  cy.get(KQL_INPUT, { timeout: DEFAULT_TIMEOUT }).type(search);
};
