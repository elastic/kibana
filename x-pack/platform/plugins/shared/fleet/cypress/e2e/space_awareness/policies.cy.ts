/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_AGENT_POLICY_BTN,
  AGENT_POLICIES_TABLE,
  AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD,
  AGENT_POLICY_DETAILS_PAGE,
  AGENT_POLICY_FLYOUT_CREATE_BUTTON,
  AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX,
} from '../../screens/fleet';
import { login } from '../../tasks/login';
import { createSpaces, enableSpaceAwareness } from '../../tasks/spaces';
import { cleanupAgentPolicies } from '../../tasks/cleanup';

describe('Space aware policies creation', { testIsolation: false }, () => {
  before(() => {
    enableSpaceAwareness();
    createSpaces();
    cleanupAgentPolicies();
    cleanupAgentPolicies('test');
    login();
  });

  beforeEach(() => {
    cy.intercept('GET', /\/api\/fleet\/agent_policies/).as('getAgentPolicies');
    cy.intercept('PUT', /\/api\/fleet\/agent_policies\/.*/).as('putAgentPolicy');
    cy.intercept('GET', /\/internal\/fleet\/agent_policies_spaces/).as('getAgentPoliciesSpaces');
  });

  const POLICY_NAME = `Policy 1 space test`;
  const NO_AGENT_POLICIES = 'No agent policies';
  it('should allow to create an agent policy in the test space', () => {
    cy.visit('/s/test/app/fleet/policies');

    cy.getBySel(ADD_AGENT_POLICY_BTN).click();
    cy.getBySel(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).type(POLICY_NAME);
    cy.getBySel(AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX).uncheck();

    cy.getBySel(AGENT_POLICY_FLYOUT_CREATE_BUTTON).click();
    cy.getBySel(AGENT_POLICIES_TABLE).contains(POLICY_NAME);
  });

  it('the created policy should not be visible in the default space', () => {
    cy.visit('/app/fleet/policies');
    cy.wait('@getAgentPolicies');
    cy.getBySel(AGENT_POLICIES_TABLE).contains(NO_AGENT_POLICIES);
  });

  it('should allow to update that policy to belong to both test and default space', () => {
    cy.visit('/s/test/app/fleet/policies');
    cy.getBySel(AGENT_POLICIES_TABLE).contains(POLICY_NAME).click();

    cy.getBySel(AGENT_POLICY_DETAILS_PAGE.SETTINGS_TAB).click();
    cy.wait('@getAgentPoliciesSpaces');
    cy.getBySel(AGENT_POLICY_DETAILS_PAGE.SPACE_SELECTOR_COMBOBOX).click().type('default{enter}');

    cy.getBySel(AGENT_POLICY_DETAILS_PAGE.SAVE_BUTTON).click();
    cy.wait('@putAgentPolicy');
  });

  it('the policy should be visible in the test space', () => {
    cy.visit('/s/test/app/fleet/policies');
    cy.wait('@getAgentPolicies');
    cy.getBySel(AGENT_POLICIES_TABLE).contains(POLICY_NAME);
  });

  it('the policy should be visible in the default space', () => {
    cy.visit('/app/fleet/policies');
    cy.wait('@getAgentPolicies');
    cy.getBySel(AGENT_POLICIES_TABLE).contains(POLICY_NAME);
  });

  it('should redirect to the agent policies list when removing the current space from a policy', () => {
    cy.visit('/s/test/app/fleet/policies');
    cy.getBySel(AGENT_POLICIES_TABLE).contains(POLICY_NAME).click();

    cy.getBySel(AGENT_POLICY_DETAILS_PAGE.SETTINGS_TAB).click();
    cy.wait('@getAgentPoliciesSpaces');

    cy.get('[title="Remove Test from selection in this group"]').click();

    cy.getBySel(AGENT_POLICY_DETAILS_PAGE.SAVE_BUTTON).click();
    cy.wait('@putAgentPolicy');

    cy.wait('@getAgentPolicies');
    cy.location('pathname').should('eq', '/s/test/app/fleet/policies');

    cy.getBySel(AGENT_POLICIES_TABLE).contains(NO_AGENT_POLICIES);
  });
});
