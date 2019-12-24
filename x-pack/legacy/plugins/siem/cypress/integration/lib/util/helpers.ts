/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { login } from '../login/helpers';

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 30 * 1000;

/**
 * Authenticates with Kibana, visits the specified `url`, and waits for the
 * Kibana logo to be displayed before continuing
 */
export const loginAndWaitForPage = (url: string) => {
  login();

  cy.visit(
    `${
      Cypress.config().baseUrl
    }${url}?timerange=(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))`
  );

  cy.viewport('macbook-15');

  cy.contains('a', 'SIEM', { timeout: DEFAULT_TIMEOUT });
};

export const waitForTableLoad = (dataTestSubj: string) =>
  cy.get(dataTestSubj, { timeout: DEFAULT_TIMEOUT });
