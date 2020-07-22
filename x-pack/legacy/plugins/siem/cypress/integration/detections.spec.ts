/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  NUMBER_OF_SIGNALS,
  OPEN_CLOSE_SIGNALS_BTN,
  SELECTED_SIGNALS,
  SHOWING_SIGNALS,
  SIGNALS,
} from '../screens/detections';

import {
  closeFirstSignal,
  closeSignals,
  goToClosedSignals,
  goToOpenedSignals,
  openFirstSignal,
  openSignals,
  selectNumberOfSignals,
  waitForSignalsPanelToBeLoaded,
  waitForSignals,
  waitForSignalsToBeLoaded,
} from '../tasks/detections';
import { esArchiverLoad } from '../tasks/es_archiver';
import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';

describe('Detections', () => {
  context('Closing signals', () => {
    beforeEach(() => {
      esArchiverLoad('signals');
      loginAndWaitForPage(DETECTIONS);
    });

    it('Closes and opens signals', () => {
      waitForSignalsPanelToBeLoaded();
      waitForSignalsToBeLoaded();

      cy.get(NUMBER_OF_SIGNALS)
        .invoke('text')
        .then((numberOfSignals) => {
          cy.get(SHOWING_SIGNALS).should('have.text', `Showing ${numberOfSignals} signals`);

          const numberOfSignalsToBeClosed = 3;
          selectNumberOfSignals(numberOfSignalsToBeClosed);

          cy.get(SELECTED_SIGNALS).should(
            'have.text',
            `Selected ${numberOfSignalsToBeClosed} signals`
          );

          closeSignals();
          waitForSignals();
          cy.reload();
          waitForSignals();

          const expectedNumberOfSignalsAfterClosing = +numberOfSignals - numberOfSignalsToBeClosed;
          cy.get(NUMBER_OF_SIGNALS).should(
            'have.text',
            expectedNumberOfSignalsAfterClosing.toString()
          );

          cy.get(SHOWING_SIGNALS).should(
            'have.text',
            `Showing ${expectedNumberOfSignalsAfterClosing.toString()} signals`
          );

          goToClosedSignals();
          waitForSignals();

          cy.get(NUMBER_OF_SIGNALS).should('have.text', numberOfSignalsToBeClosed.toString());
          cy.get(SHOWING_SIGNALS).should(
            'have.text',
            `Showing ${numberOfSignalsToBeClosed.toString()} signals`
          );
          cy.get(SIGNALS).should('have.length', numberOfSignalsToBeClosed);

          const numberOfSignalsToBeOpened = 1;
          selectNumberOfSignals(numberOfSignalsToBeOpened);

          cy.get(SELECTED_SIGNALS).should(
            'have.text',
            `Selected ${numberOfSignalsToBeOpened} signal`
          );

          openSignals();
          waitForSignals();
          cy.reload();
          waitForSignalsToBeLoaded();
          waitForSignals();
          goToClosedSignals();
          waitForSignals();

          const expectedNumberOfClosedSignalsAfterOpened = 2;
          cy.get(NUMBER_OF_SIGNALS).should(
            'have.text',
            expectedNumberOfClosedSignalsAfterOpened.toString()
          );
          cy.get(SHOWING_SIGNALS).should(
            'have.text',
            `Showing ${expectedNumberOfClosedSignalsAfterOpened.toString()} signals`
          );
          cy.get(SIGNALS).should('have.length', expectedNumberOfClosedSignalsAfterOpened);

          goToOpenedSignals();
          waitForSignals();

          const expectedNumberOfOpenedSignals =
            +numberOfSignals - expectedNumberOfClosedSignalsAfterOpened;
          cy.get(SHOWING_SIGNALS).should(
            'have.text',
            `Showing ${expectedNumberOfOpenedSignals.toString()} signals`
          );

          cy.get('[data-test-subj="server-side-event-count"]').should(
            'have.text',
            expectedNumberOfOpenedSignals.toString()
          );
        });
    });

    it('Closes one signal when more than one opened signals are selected', () => {
      waitForSignalsToBeLoaded();

      cy.get(NUMBER_OF_SIGNALS)
        .invoke('text')
        .then((numberOfSignals) => {
          const numberOfSignalsToBeClosed = 1;
          const numberOfSignalsToBeSelected = 3;

          cy.get(OPEN_CLOSE_SIGNALS_BTN).should('have.attr', 'disabled');
          selectNumberOfSignals(numberOfSignalsToBeSelected);
          cy.get(OPEN_CLOSE_SIGNALS_BTN).should('not.have.attr', 'disabled');

          closeFirstSignal();
          cy.reload();
          waitForSignalsToBeLoaded();
          waitForSignals();

          const expectedNumberOfSignals = +numberOfSignals - numberOfSignalsToBeClosed;
          cy.get(NUMBER_OF_SIGNALS).invoke('text').should('eq', expectedNumberOfSignals.toString());
          cy.get(SHOWING_SIGNALS)
            .invoke('text')
            .should('eql', `Showing ${expectedNumberOfSignals.toString()} signals`);

          goToClosedSignals();
          waitForSignals();

          cy.get(NUMBER_OF_SIGNALS)
            .invoke('text')
            .should('eql', numberOfSignalsToBeClosed.toString());
          cy.get(SHOWING_SIGNALS)
            .invoke('text')
            .should('eql', `Showing ${numberOfSignalsToBeClosed.toString()} signal`);
          cy.get(SIGNALS).should('have.length', numberOfSignalsToBeClosed);
        });
    });
  });
  context('Opening signals', () => {
    beforeEach(() => {
      esArchiverLoad('closed_signals');
      loginAndWaitForPage(DETECTIONS);
    });

    it('Open one signal when more than one closed signals are selected', () => {
      waitForSignals();
      goToClosedSignals();
      waitForSignalsToBeLoaded();

      cy.get(NUMBER_OF_SIGNALS)
        .invoke('text')
        .then((numberOfSignals) => {
          const numberOfSignalsToBeOpened = 1;
          const numberOfSignalsToBeSelected = 3;

          cy.get(OPEN_CLOSE_SIGNALS_BTN).should('have.attr', 'disabled');
          selectNumberOfSignals(numberOfSignalsToBeSelected);
          cy.get(OPEN_CLOSE_SIGNALS_BTN).should('not.have.attr', 'disabled');

          openFirstSignal();
          cy.reload();
          goToClosedSignals();
          waitForSignalsToBeLoaded();
          waitForSignals();

          const expectedNumberOfSignals = +numberOfSignals - numberOfSignalsToBeOpened;
          cy.get(NUMBER_OF_SIGNALS).invoke('text').should('eq', expectedNumberOfSignals.toString());
          cy.get(SHOWING_SIGNALS)
            .invoke('text')
            .should('eql', `Showing ${expectedNumberOfSignals.toString()} signals`);

          goToOpenedSignals();
          waitForSignals();

          cy.get(NUMBER_OF_SIGNALS)
            .invoke('text')
            .should('eql', numberOfSignalsToBeOpened.toString());
          cy.get(SHOWING_SIGNALS)
            .invoke('text')
            .should('eql', `Showing ${numberOfSignalsToBeOpened.toString()} signal`);
          cy.get(SIGNALS).should('have.length', numberOfSignalsToBeOpened);
        });
    });
  });
});
