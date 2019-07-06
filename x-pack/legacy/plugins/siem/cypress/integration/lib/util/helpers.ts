/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { login } from '../login/helpers';

const KIBANA_LOGO_TIMEOUT = 10 * 1000;

/**
 * Authenticates with Kibana, visits the specified `url`, and waits for the
 * Kibana logo to be displayed before continuing
 */
export const loginAndWaitForPage = (url: string) => {
  login();

  cy.visit(url);

  cy.viewport('macbook-15');

  cy.contains('a', 'SIEM', { timeout: KIBANA_LOGO_TIMEOUT });
};
