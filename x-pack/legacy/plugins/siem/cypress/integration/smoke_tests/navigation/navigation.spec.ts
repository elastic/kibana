/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { login } from '../../lib/login/helpers';
import { logout } from '../../lib/logout';
import { HOSTS_PAGE, NETWORK_PAGE, OVERVIEW_PAGE, TIMELINES_PAGE } from '../../lib/urls';
import {
  NAVIGATION_HOSTS,
  NAVIGATION_NETWORK,
  NAVIGATION_OVERVIEW,
  NAVIGATION_TIMELINES,
} from '../../lib/navigation/selectors';

/* eslint-disable spaced-comment */
/// <reference types="cypress"/>

const NAVIGATION_TIMEOUT = 10 * 1000;

describe('top-level navigation common to all pages in the SIEM app', () => {
  beforeEach(() => {
    login();

    cy.viewport('macbook-15');
  });

  afterEach(() => {
    logout();
  });

  it('navigates to the Overview page', () => {
    cy.visit(TIMELINES_PAGE);

    cy.get(NAVIGATION_OVERVIEW, { timeout: NAVIGATION_TIMEOUT }).click({ force: true });

    cy.url().should('include', '/siem#/overview');
  });

  it('navigates to the Hosts page', () => {
    cy.visit(NETWORK_PAGE);

    cy.get(NAVIGATION_HOSTS, { timeout: NAVIGATION_TIMEOUT }).click({ force: true });

    cy.url().should('include', '/siem#/hosts');
  });

  it('navigates to the Network page', () => {
    cy.visit(HOSTS_PAGE);

    cy.get(NAVIGATION_NETWORK, { timeout: NAVIGATION_TIMEOUT }).click({ force: true });

    cy.url().should('include', '/siem#/network');
  });

  it('navigates to the Timelines page', () => {
    cy.visit(OVERVIEW_PAGE);

    cy.get(NAVIGATION_TIMELINES, { timeout: NAVIGATION_TIMEOUT }).click({ force: true });

    cy.url().should('include', '/siem#/timelines');
  });
});
