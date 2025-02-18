/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, loginAndWaitForPage, logout } from '../tasks/login';
import {
  CREATE_INTEGRATION_LANDING_PAGE,
  LICENSE_PAYWALL_CARD,
} from '../screens/integrations_automatic_import';

describe('User with basic license should hit License Paywall', () => {
  beforeEach(() => {
    login();
    cy.intercept('/api/licensing/info', {
      license: {
        uid: 'someId',
        type: 'basic',
        mode: 'basic',
        expiryDateInMillis: 4884310543000,
        status: 'active',
      },
      signature: 'someIdAgain',
    });
  });
  afterEach(() => {
    logout();
  });

  it('Create Integration is not accessible when user is basic', () => {
    loginAndWaitForPage(CREATE_INTEGRATION_LANDING_PAGE);
    cy.getBySel(LICENSE_PAYWALL_CARD).should('exist');
  });
});
