/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOGOUT_LINK, USER_MENU } from './selectors';

/* eslint-disable spaced-comment */
/// <reference types="cypress"/>

export const logout = () => {
  cy.get(USER_MENU).click();

  cy.get(LOGOUT_LINK).click();
};
