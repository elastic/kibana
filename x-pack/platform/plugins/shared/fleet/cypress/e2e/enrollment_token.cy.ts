/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '@kbn/fleet-plugin/common/constants';

import { cleanupAgentPolicies } from '../tasks/cleanup';
import { ENROLLMENT_TOKENS } from '../screens/fleet';
import { CONFIRM_MODAL } from '../screens/navigation';

import { request } from '../tasks/common';
import { login } from '../tasks/login';

describe('Enrollment token page', () => {
  before(() => {
    request({
      method: 'POST',
      url: '/api/fleet/agent_policies',
      body: {
        name: 'Agent policy 1',
        namespace: 'default',
        description: '',
        monitoring_enabled: ['logs', 'metrics'],
        id: 'agent-policy-1',
      },
      headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
    });
  });

  after(() => {
    cleanupAgentPolicies();
  });

  beforeEach(() => {
    login();
  });

  it('Create new Token', () => {
    cy.visit('app/fleet/enrollment-tokens');
    cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_BUTTON).click();
    cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD).clear().type('New Token');
    cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_SELECT_FIELD)
      .find('input')
      .type('{downArrow}{enter}');
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE, { timeout: 15000 }).contains('Agent policy 1');
  });

  it('Delete Token - inactivates the token', () => {
    cy.visit('app/fleet/enrollment-tokens');
    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE)
      .find('.euiTableRow')
      .should('have.length.at.least', 1);

    // Open the per-row actions menu and click revoke
    cy.getBySel(ENROLLMENT_TOKENS.TABLE_ACTIONS_MENU).first().click();
    cy.getBySel(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    // Default filter is "Active", so the revoked token should disappear from the list.
    // Switch to "Inactive" to verify it was revoked.
    cy.getBySel(ENROLLMENT_TOKENS.FILTER_INACTIVE).click();
    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE)
      .find('.euiTableRow')
      .should('have.length.at.least', 1);
  });
});
