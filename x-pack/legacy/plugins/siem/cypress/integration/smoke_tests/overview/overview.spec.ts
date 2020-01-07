/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OVERVIEW_PAGE } from '../../lib/urls';
import { clearFetch, stubApi } from '../../lib/fixtures/helpers';
import { HOST_STATS, NETWORK_STATS, STAT_AUDITD } from '../../lib/overview/selectors';
import { loginAndWaitForPage } from '../../lib/util/helpers';

describe('Overview Page', () => {
  beforeEach(() => {
    clearFetch();
    stubApi('overview');
    loginAndWaitForPage(OVERVIEW_PAGE);
  });

  it('Host and Network stats render with correct values', () => {
    cy.get(STAT_AUDITD.domId);

    HOST_STATS.forEach(stat => {
      cy.get(stat.domId)
        .invoke('text')
        .should('eq', stat.value);
    });

    NETWORK_STATS.forEach(stat => {
      cy.get(stat.domId)
        .invoke('text')
        .should('eq', stat.value);
    });
  });
});
