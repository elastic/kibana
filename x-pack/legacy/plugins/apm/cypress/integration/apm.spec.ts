/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line spaced-comment
/// <reference types="cypress" />

import { loginAndWaitForPage } from './helpers';

const rangeFrom = '2019-09-04T18:00:00.000Z';
const rangeTo = '2019-09-05T06:00:00.000Z';

describe('When clicking opbeans-go service', () => {
  before(() => {
    // open service overview page
    loginAndWaitForPage(
      `/app/apm#/services?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`
    );

    // show loading text for services
    cy.contains('Loading...');

    // click the first service in the list
    cy.get('[data-cy=link-to-service-opbeans-go]').click({ force: true });
  });

  it('should redirect to correct path with correct params', () => {
    cy.url().should('contain', `/app/apm#/services/opbeans-go/transactions`);
    cy.url().should('contain', `rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`);
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
