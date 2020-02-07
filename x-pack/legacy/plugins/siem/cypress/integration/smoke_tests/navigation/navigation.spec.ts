/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMELINES_PAGE } from '../../../urls/navigation';
import { HOSTS, NETWORK, OVERVIEW, TIMELINES } from '../../../screens/header';
import { loginAndWaitForPage } from '../../../tasks/login';
import { navigateFromHeaderTo } from '../../../tasks/header';

describe('top-level navigation common to all pages in the SIEM app', () => {
  before(() => {
    loginAndWaitForPage(TIMELINES_PAGE);
  });
  it('navigates to the Overview page', () => {
    navigateFromHeaderTo(OVERVIEW);
    cy.url().should('include', '/siem#/overview');
  });

  it('navigates to the Hosts page', () => {
    navigateFromHeaderTo(HOSTS);
    cy.url().should('include', '/siem#/hosts');
  });

  it('navigates to the Network page', () => {
    navigateFromHeaderTo(NETWORK);
    cy.url().should('include', '/siem#/network');
  });

  it('navigates to the Timelines page', () => {
    navigateFromHeaderTo(TIMELINES);
    cy.url().should('include', '/siem#/timelines');
  });
});
