/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { login } from '../../lib/login';
import { logout } from '../../lib/logout';
import { OVERVIEW_PAGE } from '../../lib/urls';
import { clearFetch, stubApi } from '../../lib/fixtures/helpers';
import { HOST_STATS, NETWORK_STATS, STAT_AUDITD } from '../../lib/overview/selectors';

/* eslint-disable spaced-comment */
/// <reference types="cypress"/>

const OVERVIEW_TIMEOUT = 10 * 1000;

describe('Overview Page', () => {
  beforeEach(() => {
    clearFetch();
    login();

    cy.viewport('macbook-15');
  });

  afterEach(() => {
    logout();
  });

  it('Host and Network stats render with correct values', () => {
    stubApi('overview');
    cy.visit(OVERVIEW_PAGE);

    // wait for stats to load (only need to check one w/ timeout
    cy.get(STAT_AUDITD.domId, { timeout: OVERVIEW_TIMEOUT });

    HOST_STATS.forEach(stat => {
      cy.get(stat.domId, { timeout: OVERVIEW_TIMEOUT })
        .invoke('text')
        .should(statValue => {
          expect(statValue).to.eq(stat.value);
        });
    });

    NETWORK_STATS.forEach(stat => {
      cy.get(stat.domId, { timeout: OVERVIEW_TIMEOUT })
        .invoke('text')
        .should(statValue => {
          expect(statValue).to.eq(stat.value);
        });
    });
  });
});
