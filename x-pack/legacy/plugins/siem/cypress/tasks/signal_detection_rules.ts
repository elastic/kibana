/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LOAD_PREBUILT_RULES_BTN,
  LOADING_INITIAL_PREBUILT_RULES_TABLE,
  LOADING_SPINNER,
  PAGINATION_POPOVER_BTN,
  RULES_TABLE,
  THREE_HUNDRED_ROWS,
} from '../screens/signal_detection_rules';

export const changeToThreeHundredRowsPerPage = () => {
  cy.get(PAGINATION_POPOVER_BTN).click({ force: true });
  cy.get(THREE_HUNDRED_ROWS).click();
};

export const loadPrebuiltDetectionRules = () => {
  cy.get(LOAD_PREBUILT_RULES_BTN)
    .should('exist')
    .click({ force: true });
};

export const waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded = () => {
  cy.get(LOADING_INITIAL_PREBUILT_RULES_TABLE).should('exist');
  cy.get(LOADING_INITIAL_PREBUILT_RULES_TABLE).should('not.exist');
};

export const waitForPrebuiltDetectionRulesToBeLoaded = () => {
  cy.get(LOAD_PREBUILT_RULES_BTN).should('not.exist');
  cy.get(RULES_TABLE).should('exist');
};

export const waitForRulesToBeLoaded = () => {
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};
