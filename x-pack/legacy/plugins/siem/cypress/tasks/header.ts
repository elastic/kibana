/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KQL_INPUT } from '../screens/header';
import { DEFAULT_TIMEOUT } from '../tasks/login';

export const navigateFromHeaderTo = (page: string) => {
  cy.get(page).click({ force: true });
};

export const clearSearchBar = () => {
  cy.get(KQL_INPUT, { DEFAULT_TIMEOUT })
    .clear()
    .type('{enter}');
};
