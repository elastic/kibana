/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CLOSED_SIGNALS_BTN,
  EXPAND_SIGNAL_BTN,
  LOADING_SIGNALS_PANEL,
  MANAGE_SIGNAL_DETECTION_RULES_BTN,
  OPEN_CLOSE_SIGNAL_BTN,
  OPEN_CLOSE_SIGNALS_BTN,
  OPENED_SIGNALS_BTN,
  SEND_SIGNAL_TO_TIMELINE_BTN,
  SIGNALS,
  SIGNAL_CHECKBOX,
} from '../screens/detections';
import { REFRESH_BUTTON } from '../screens/siem_header';

export const closeFirstSignal = () => {
  cy.get(OPEN_CLOSE_SIGNAL_BTN).first().click({ force: true });
};

export const closeSignals = () => {
  cy.get(OPEN_CLOSE_SIGNALS_BTN).click({ force: true });
};

export const expandFirstSignal = () => {
  cy.get(EXPAND_SIGNAL_BTN).first().click({ force: true });
};

export const goToClosedSignals = () => {
  cy.get(CLOSED_SIGNALS_BTN).click({ force: true });
};

export const goToManageSignalDetectionRules = () => {
  cy.get(MANAGE_SIGNAL_DETECTION_RULES_BTN).should('exist').click({ force: true });
};

export const goToOpenedSignals = () => {
  cy.get(OPENED_SIGNALS_BTN).click({ force: true });
};

export const openFirstSignal = () => {
  cy.get(OPEN_CLOSE_SIGNAL_BTN).first().click({ force: true });
};

export const openSignals = () => {
  cy.get(OPEN_CLOSE_SIGNALS_BTN).click({ force: true });
};

export const selectNumberOfSignals = (numberOfSignals: number) => {
  for (let i = 0; i < numberOfSignals; i++) {
    cy.get(SIGNAL_CHECKBOX).eq(i).click({ force: true });
  }
};

export const investigateFirstSignalInTimeline = () => {
  cy.get(SEND_SIGNAL_TO_TIMELINE_BTN).first().click({ force: true });
};

export const waitForSignals = () => {
  cy.get(REFRESH_BUTTON).invoke('text').should('not.equal', 'Updating');
};

export const waitForSignalsIndexToBeCreated = () => {
  cy.request({ url: '/api/detection_engine/index', retryOnStatusCodeFailure: true }).then(
    (response) => {
      if (response.status !== 200) {
        cy.wait(7500);
      }
    }
  );
};

export const waitForSignalsPanelToBeLoaded = () => {
  cy.get(LOADING_SIGNALS_PANEL).should('exist');
  cy.get(LOADING_SIGNALS_PANEL).should('not.exist');
};

export const waitForSignalsToBeLoaded = () => {
  const expectedNumberOfDisplayedSignals = 25;
  cy.get(SIGNALS).should('have.length', expectedNumberOfDisplayedSignals);
};
