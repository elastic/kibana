/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OVERVIEW_PAGE, TIMELINES_PAGE } from '../../lib/urls';
import {
  NAVIGATION_HOSTS,
  NAVIGATION_NETWORK,
  NAVIGATION_OVERVIEW,
  NAVIGATION_TIMELINES,
} from '../../lib/navigation/selectors';
import { loginAndWaitForPage } from '../../lib/util/helpers';

describe('top-level navigation common to all pages in the SIEM app', () => {
  it('navigates to the Overview page', () => {
    loginAndWaitForPage(TIMELINES_PAGE);

    cy.get(NAVIGATION_OVERVIEW).click({ force: true });

    cy.url().should('include', '/siem#/overview');
  });

  it('navigates to the Hosts page', () => {
    loginAndWaitForPage(TIMELINES_PAGE);

    cy.get(NAVIGATION_HOSTS).click({ force: true });

    cy.url().should('include', '/siem#/hosts');
  });

  it('navigates to the Network page', () => {
    loginAndWaitForPage(TIMELINES_PAGE);

    cy.get(NAVIGATION_NETWORK).click({ force: true });

    cy.url().should('include', '/siem#/network');
  });

  it('navigates to the Timelines page', () => {
    loginAndWaitForPage(OVERVIEW_PAGE);

    cy.get(NAVIGATION_TIMELINES).click({ force: true });

    cy.url().should('include', '/siem#/timelines');
  });
});
