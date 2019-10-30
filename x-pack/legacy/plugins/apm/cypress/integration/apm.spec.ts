/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage } from './helpers';

describe('When clicking opbeans-go service', () => {
  before(() => {
    // open service overview page
    loginAndWaitForPage(`/app/apm#/services`);

    // show loading text for services
    cy.contains('Loading...');

    // click opbeans-go service
    cy.get(':contains(opbeans-go)')
      .last()
      .click({ force: true });
  });

  it('should redirect to correct path with correct params', () => {
    cy.url().should('contain', `/app/apm#/services/opbeans-go/transactions`);
    cy.url().should('contain', `transactionType=request`);
  });

  describe('transaction duration charts', () => {
    it('should have correct y-axis ticks', () => {
      const yAxisTick =
        '[data-cy=transaction-duration-charts] .rv-xy-plot__axis--vertical .rv-xy-plot__axis__tick__text';

      cy.get(yAxisTick)
        .eq(2)
        .invoke('text')
        .snapshot();

      cy.get(yAxisTick)
        .eq(1)
        .invoke('text')
        .snapshot();

      cy.get(yAxisTick)
        .eq(0)
        .invoke('text')
        .snapshot();
    });
  });

  describe('TPM charts', () => {});

  describe('Transaction group list', () => {});
});
