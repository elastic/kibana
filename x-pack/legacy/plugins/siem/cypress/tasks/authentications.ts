/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATIONS_TABLE } from '../screens/authentications';
import { DEFAULT_TIMEOUT } from '../tasks/login';

export const waitForAuthenticationsToBeLoaded = () => {
  cy.get(AUTHENTICATIONS_TABLE, { timeout: DEFAULT_TIMEOUT }).should('exist');
};
