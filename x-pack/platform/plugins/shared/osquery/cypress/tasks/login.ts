/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { disableNewFeaturesTours } from './navigation';
import { ServerlessRoleName } from '../support/roles';

import { request } from './common';

// Functions that mocks the list/index call
const createListsIndex = () => {
  request({
    method: 'POST',
    url: '/api/lists/index',
    failOnStatusCode: false,
  });
};

// Login as a SOC_MANAGER to properly initialize Security Solution App
export const initializeDataViews = () => {
  cy.login(ServerlessRoleName.SOC_MANAGER);
  createListsIndex();
  cy.visit('/app/security/alerts', {
    onBeforeLoad: (win) => disableNewFeaturesTours(win),
  });
  // Wait for loading to complete - don't require it to appear first (page may load quickly)
  cy.getBySel('globalLoadingIndicator', { timeout: 1.5 * 60 * 1000 }).should('not.exist');
  cy.getBySel('alerts-page-manage-alert-detection-rules').should('exist');
};
