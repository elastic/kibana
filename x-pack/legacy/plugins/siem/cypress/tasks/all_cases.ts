/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CREATE_NEW_CASE_BTN } from '../screens/all_cases';

export const goToCreateNewCase = () => {
  cy.get(CREATE_NEW_CASE_BTN).click({ force: true });
};
