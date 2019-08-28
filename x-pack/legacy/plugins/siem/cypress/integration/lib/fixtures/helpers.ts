/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Cypress workaround to hijack XHR
// https://github.com/cypress-io/cypress/issues/687
export const clearFetch = () =>
  cy.on('window:before:load', win => {
    // @ts-ignore no null, this is a temp hack see issue above
    win.fetch = null;
  });

export const stubApi = (dataFileName: string) => {
  cy.server();
  cy.fixture(dataFileName).as(`${dataFileName}JSON`);
  cy.route('POST', 'api/siem/graphql', `@${dataFileName}JSON`);
};
