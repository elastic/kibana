/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

import { safeLoad } from 'js-yaml';

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

    cy.log(
      `Authenticating via config credentials from "${KIBANA_DEV_YML_PATH}". username: ${username}, password: ${password}`
    );

    cy.visit(`${Cypress.config().baseUrl}${url}`, {
      auth: { username, password }
    });
  });

  cy.viewport('macbook-15');

  // wait for loading spinner to disappear
  cy.get('.kibanaLoaderWrap', { timeout: DEFAULT_TIMEOUT }).should('not.exist');
}
