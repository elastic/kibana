/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOGOUT } from '../urls';

export const logout = (): null => {
  cy.visit(`${Cypress.config().baseUrl}${LOGOUT}`);
  return null;
};
