/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOADING_SIGNALS_PANEL, MANAGE_SIGNAL_DETECTION_RULES_BTN } from '../screens/detections';

export const goToManageSignalDetectionRules = () => {
  cy.get(MANAGE_SIGNAL_DETECTION_RULES_BTN)
    .should('exist')
    .click({ force: true });
};

export const waitForSignalsIndexToBeCreated = () => {
  cy.request({ url: '/api/detection_engine/index', retryOnStatusCodeFailure: true }).then(
    response => {
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
