/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

const RANGE_FROM = '2019-09-04T18:00:00.000Z';
const RANGE_TO = '2019-09-05T06:00:00.000Z';
const BASE_URL = Cypress.config().baseUrl;

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 60 * 1000;

export function loginAndWaitForPage(url: string) {
  const username = Cypress.env('elasticsearch_username');
  const password = Cypress.env('elasticsearch_password');

  const hasCredentials = username && password;
  cy.log(`Authenticating via ${username} / ${password}`);

  const options = hasCredentials ? { auth: { username, password } } : {};

  const fullUrl = `${BASE_URL}${url}?rangeFrom=${RANGE_FROM}&rangeTo=${RANGE_TO}`;
  cy.visit(fullUrl, options);

  cy.viewport('macbook-15');

  // wait for loading spinner to disappear
  cy.get('.kibanaLoaderWrap', { timeout: DEFAULT_TIMEOUT }).should('not.exist');
}
