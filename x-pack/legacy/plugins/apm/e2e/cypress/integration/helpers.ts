/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

import { safeLoad } from 'js-yaml';

const RANGE_FROM = '2019-09-04T18:00:00.000Z';
const RANGE_TO = '2019-09-05T06:00:00.000Z';
const BASE_URL = Cypress.config().baseUrl;

/**
 * Credentials in the `kibana.dev.yml` config file will be used to authenticate with Kibana
 */
const KIBANA_DEV_YML_PATH = '../../../../../config/kibana.dev.yml';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 30 * 1000;

export function loginAndWaitForPage(url: string) {
  // read the login details from `kibana.dev.yml`
  cy.readFile(KIBANA_DEV_YML_PATH).then(kibanaDevYml => {
    const config = safeLoad(kibanaDevYml);
    const username = config['elasticsearch.username'];
    const password = config['elasticsearch.password'];

    const hasCredentials = username && password;

    cy.log(
      `Authenticating via config credentials from "${KIBANA_DEV_YML_PATH}". username: ${username}, password: ${password}`
    );

    const options = hasCredentials
      ? {
          auth: { username, password }
        }
      : {};

    const fullUrl = `${BASE_URL}${url}?rangeFrom=${RANGE_FROM}&rangeTo=${RANGE_TO}`;
    cy.visit(fullUrl, options);
  });

  cy.viewport('macbook-15');

  // wait for loading spinner to disappear
  cy.get('.kibanaLoaderWrap', { timeout: DEFAULT_TIMEOUT }).should('not.exist');
}
