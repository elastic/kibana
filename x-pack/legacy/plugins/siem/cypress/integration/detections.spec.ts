/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esArchiverLoad } from '../tasks/es_archiver';
import { loginAndWaitForPage } from '../tasks/login';
import { DETECTIONS } from '../urls/navigation';
import { REFRESH_BUTTON } from '../screens/siem_header';
import { waitForSignalsIndexToBeCreated } from '../tasks/detections';

describe('Detections', () => {
  before(() => {
    esArchiverLoad('signals');
    loginAndWaitForPage(DETECTIONS);
  });

  it('Closes and opens signals', () => {
    cy.get('[data-test-subj="loading-signals-panel"]').should('exist');
    cy.get('[data-test-subj="loading-signals-panel"]').should('not.exist');

    cy.get(REFRESH_BUTTON)
      .invoke('text')
      .should('not.equal', 'Updating');
    cy.get('[data-test-subj="event"]').should('have.length', 25);

    waitForSignalsIndexToBeCreated();

    cy.get('[data-test-subj="server-side-event-count"]')
      .invoke('text')
      .then(numberOfSignals => {
        cy.get('[data-test-subj="showingRules"]')
          .invoke('text')
          .should('eql', `Showing ${numberOfSignals} signals`);

        for (let i = 0; i < 3; i++) {
          cy.get('[data-test-subj="select-event-container"] .euiCheckbox__input')
            .eq(i)
            .click({ force: true });
        }
        // cy.wait(1000);
        cy.get('[data-test-subj="openCloseSignal"] .siemLinkIcon__label').click({ force: true });

        cy.get(REFRESH_BUTTON)
          .invoke('text')
          .should('not.equal', 'Updating');

        waitForSignalsIndexToBeCreated();

        const expected = +numberOfSignals - 3;
        // cy.wait(5000);
        // cy.pause();
        cy.get('[data-test-subj="server-side-event-count"]')
          .invoke('text')
          .should('eq', expected.toString());
        cy.get('[data-test-subj="showingRules"]')
          .invoke('text')
          .should('eql', `Showing ${expected.toString()} signals`);

        cy.get('[data-test-subj="closedSignals"]').click({ force: true });

        // cy.wait(3000);

        cy.get(REFRESH_BUTTON)
          .invoke('text')
          .should('not.equal', 'Updating');

        cy.get('[data-test-subj=server-side-event-count]')
          .invoke('text')
          .should('eql', '3');
        cy.get('[data-test-subj="showingRules"]')
          .invoke('text')
          .should('eql', `Showing 3 signals`);
        cy.get('[data-test-subj="event"]').should('have.length', 3);

        for (let i = 0; i < 1; i++) {
          cy.get('[data-test-subj="select-event-container"] .euiCheckbox__input')
            .eq(i)
            .click({ force: true });
        }

        // cy.wait(5000);
        // cy.pause();

        cy.get('[data-test-subj="openCloseSignal"] .siemLinkIcon__label').click({ force: true });

        cy.get(REFRESH_BUTTON)
          .invoke('text')
          .should('not.equal', 'Updating');

        waitForSignalsIndexToBeCreated();

        // cy.wait(5000)

        cy.get('[data-test-subj=server-side-event-count]')
          .invoke('text')
          .should('eql', '2');
        cy.get('[data-test-subj="showingRules"]')
          .invoke('text')
          .should('eql', `Showing 2 signals`);

        cy.get('[data-test-subj="event"]').should('have.length', 2);

        cy.get('[data-test-subj=openSignals]').click({ force: true });

        // cy.wait(5000);
        // cy.pause();

        cy.get('[data-test-subj="showingRules"]')
          .invoke('text')
          .should('eql', `Showing 106 signals`);

        cy.get('[data-test-subj="server-side-event-count"]')
          .invoke('text')
          .should('eql', '106');
      });
  });
});
