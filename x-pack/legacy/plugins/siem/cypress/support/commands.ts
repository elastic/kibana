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

type logout = typeof logout;
type loginRequest = typeof loginRequest;
type loginViaEnvironmentCredentials = typeof loginViaEnvironmentCredentials;
type loginViaConfig = typeof loginViaConfig;
type login = typeof login;
type visitSiem = typeof visitSiem;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  module Cypress {
    interface Chainable {
      logout: logout;
      loginRequest: loginRequest;
      loginViaEnvironmentCredentials: loginViaEnvironmentCredentials;
      loginViaConfig: loginViaConfig;
      login: login;
      visitSiem: visitSiem;
    }
  }
}

export function logout() {
  return cy
    .request({
      method: 'GET',
      url: `${Cypress.config().baseUrl}/logout`,
    })
    .then(response => {
      expect(response.status).to.eq(200);
    });
}

export function loginRequest(username: string, password: string) {
  return cy.request({
    body: {
      username,
      password,
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    method: 'POST',
    url: `${Cypress.config().baseUrl}/api/security/v1/login`,
  });
}

export function loginViaEnvironmentCredentials() {
  return cy.loginRequest(
    Cypress.env('ELASTICSEARCH_USERNAME'),
    Cypress.env('ELASTICSEARCH_PASSWORD')
  );
}

export function loginViaConfig() {
  return cy.readFile(KIBANA_DEV_YML_PATH).then(kibanaDevYml => {
    const config = yaml.safeLoad(kibanaDevYml);
    cy.loginRequest(config.elasticsearch.username, config.elasticsearch.password);
  });
}

export function login() {
  if (
    Cypress.env('ELASTICSEARCH_USERNAME') != null &&
    Cypress.env('ELASTICSEARCH_PASSWORD') != null
  ) {
    cy.loginViaEnvironmentCredentials();
  } else {
    cy.loginViaConfig();
  }
}

export function visitSiem(url: string) {
  cy.login();
  cy.visit(`${Cypress.config().baseUrl}${url}`);
  cy.viewport('macbook-15');
  cy.contains('a', 'SIEM', { timeout: 30000 });
}

Cypress.Commands.add('logout', logout);
Cypress.Commands.add('loginRequest', loginRequest);
Cypress.Commands.add('loginViaEnvironmentCredentials', loginViaEnvironmentCredentials);
Cypress.Commands.add('loginViaConfig', loginViaConfig);
Cypress.Commands.add('login', login);
Cypress.Commands.add('visitSiem', visitSiem);
