/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { ServerlessRoleName } from '../support/roles';
import { cleanupRule, loadRule } from './api_fixtures';
import { closeDateTabIfVisible } from './integrations';

export const RESPONSE_ACTIONS_ERRORS = 'response-actions-error';
export const RESPONSE_ACTIONS_ITEM_0 = 'response-actions-list-item-0';
export const RESPONSE_ACTIONS_ITEM_1 = 'response-actions-list-item-1';
export const RESPONSE_ACTIONS_ITEM_2 = 'response-actions-list-item-2';

export const OSQUERY_RESPONSE_ACTION_ADD_BUTTON = 'Osquery-response-action-type-selection-option';
export const ENDPOINT_RESPONSE_ACTION_ADD_BUTTON =
  'Elastic Defend-response-action-type-selection-option';

export const checkOsqueryResponseActionsPermissions = (enabled: boolean) => {
  let ruleId: string;

  afterEach(() => {
    cleanupRule(ruleId);
  });

  beforeEach(() => {
    loadRule().then((data) => {
      ruleId = data.id;
    });
    cy.login(ServerlessRoleName.SOC_MANAGER);
  });

  it(`response actions should ${enabled ? 'be available ' : 'not be available'}`, () => {
    cy.intercept('GET', `/api/detection_engine/rules?id=${ruleId}`).as('getRule');
    cy.visit(`/app/security/rules/id/${ruleId}/edit`);
    cy.getBySel('globalLoadingIndicator').should('not.exist');

    // 2 calls are made to get the rule, so we need to wait for both since only on the second one's success the UI is updated
    cy.wait('@getRule', { timeout: 2 * 60 * 1000 })
      .its('response.statusCode')
      .should('eq', 200);
    cy.wait('@getRule', { timeout: 2 * 60 * 1000 })
      .its('response.statusCode')
      .should('eq', 200);

    closeDateTabIfVisible();
    cy.getBySel('edit-rule-actions-tab').click();

    // In rare cases, the button is not clickable due to the page not being fully loaded
    recurse(
      () => {
        cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();

        return cy.getBySel('alertActionAccordion').should(Cypress._.noop);
      },
      ($el) => $el.length === 1,
      { limit: 5, delay: 2000 }
    );

    // At this point we should have the response actions available or not
    if (enabled) {
      cy.getBySel(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON).click();
      cy.contains('Query is a required field');
      cy.contains('Select an endpoint response action.');
    } else {
      cy.contains('Upgrade your license to Endpoint Complete to use Osquery Response Actions.');
      cy.getBySel(ENDPOINT_RESPONSE_ACTION_ADD_BUTTON).should('be.disabled');
    }
  });
};
