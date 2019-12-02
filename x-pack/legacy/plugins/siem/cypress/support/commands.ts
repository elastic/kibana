/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';

/**
 * Credentials in the `kibana.dev.yml` config file will be used to authenticate
 * with Kibana when credentials are not provided via environment variables
 */

const KIBANA_DEV_YML_PATH = '../../../../config/kibana.dev.yml';

Cypress.Commands.add('logout', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.config().baseUrl}/logout`,
  }).then(response => {
    expect(response.status).to.eq(200);
  });
});

Cypress.Commands.add('loginRequest', (username, password) => {
  cy.request({
    body: {
      username,
      password,
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    method: 'POST',
    url: `${Cypress.config().baseUrl}/api/security/v1/login`,
  });
});

Cypress.Commands.add('loginViaEnvironmentCredentials', () => {
  cy.loginRequest(Cypress.env('ELASTICSEARCH_USERNAME'), Cypress.env('ELASTICSEARCH_PASSWORD'));
});

Cypress.Commands.add('loginViaConfig', () => {
  cy.readFile(KIBANA_DEV_YML_PATH).then(kibanaDevYml => {
    const config = yaml.safeLoad(kibanaDevYml);
    cy.loginRequest(config.elasticsearch.username, config.elasticsearch.password);
  });
});

Cypress.Commands.add('login', () => {
  if (
    Cypress.env('ELASTICSEARCH_USERNAME') != null &&
    Cypress.env('ELASTICSEARCH_PASSWORD') != null
  ) {
    cy.loginViaEnvironmentCredentials();
  } else {
    cy.loginViaConfig();
  }
});

Cypress.Commands.add('visitSiem', url => {
  cy.login();
  cy.visit(`${Cypress.config().baseUrl}${url}`);
  cy.viewport('macbook-15');
  cy.contains('a', 'SIEM', { timeout: 30000 });
});
