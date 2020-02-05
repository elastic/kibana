/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OVERVIEW_PAGE } from '../../../urls/navigation';
import { HOST_STATS, NETWORK_STATS } from '../../../screens/overview';
import { expandHostStats, expandNetworkStats } from '../../../tasks/overview';
import { loginAndWaitForPage } from '../../lib/util/helpers';

describe('Overview Page', () => {
  before(() => {
    cy.stubSIEMapi('overview');
    loginAndWaitForPage(OVERVIEW_PAGE);
  });

  it('Host stats render with correct values', () => {
    expandHostStats();

    HOST_STATS.forEach(stat => {
      cy.get(stat.domId)
        .invoke('text')
        .should('eq', stat.value);
    });
  });

  it('Network stats render with correct values', () => {
    expandNetworkStats();

    NETWORK_STATS.forEach(stat => {
      cy.get(stat.domId)
        .invoke('text')
        .should('eq', stat.value);
    });
  });
});
