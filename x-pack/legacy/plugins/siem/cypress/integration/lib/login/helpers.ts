/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as yaml from 'js-yaml';

import { LOGIN_PAGE } from '../urls';

import { DEFAULT_SPACE_BUTTON, PASSWORD, USERNAME } from './selectors';

/**
 * The `username` and `password` values in the `elasticsearch` section of this
 * file will be used to login to Kibana
 */
const KIBANA_DEV_YML_PATH = '../../../../config/kibana.dev.yml';

/** Wait this long for the login page wait (ms) */
const USERNAME_TIMEOUT = 10 * 1000;

/**
 * Authenticates with Kibana by POSTing the username and password directly to
 * Kibana's `security/v1/login` endpoint, bypassing the login page (for speed).
 *
 * To speed the execution of tests, prefer this function over authenticating
 * via an interactive login.
 */
export const login = () => {
  cy.log(
    `NON-interactively logging into Kibana with the \`username\` and \`password\` from the \`elasticsearch\` section of \`${KIBANA_DEV_YML_PATH}\``
  );

  // read the login details
  cy.readFile(KIBANA_DEV_YML_PATH).then(kibanaDevYml => {
    const config = yaml.safeLoad(kibanaDevYml);

    // programmatically log us in without needing the UI
    cy.request({
      body: {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      },
      followRedirect: false,
      headers: { 'kbn-xsrf': 'cypress' },
      method: 'POST',
      url: 'http://localhost:5601/api/security/v1/login',
    });
  });
};

/**
 * This (slower) login function authenticates with Kibana via the login page.
 * To speed the execution of tests, is generally preferable to use the
 * NON-interactive `login` function (in this file) instead, because in
 * addition to having to wait for the interactive Kibana login page to load,
 * this function also waits for the "spaces" page to load after
 * authenticating so it can click on the default space.
 */
export const interactiveLogin = () => {
  cy.log(
    `Interactively logging into Kibana with the \`username\` and \`password\` from the \`elasticsearch\` section of \`${KIBANA_DEV_YML_PATH}\``
  );

  // read the login details
  cy.readFile(KIBANA_DEV_YML_PATH).then(kibanaDevYml => {
    const config = yaml.safeLoad(kibanaDevYml);

    cy.visit(LOGIN_PAGE);

    cy.get(USERNAME, { timeout: USERNAME_TIMEOUT }).type(config.elasticsearch.username);
    cy.get(PASSWORD).type(`${config.elasticsearch.password}{enter}`, {
      log: false,
    });

    cy.get(DEFAULT_SPACE_BUTTON).click(); // click the `Default` space in the `Select Your Space` page
  });
};
