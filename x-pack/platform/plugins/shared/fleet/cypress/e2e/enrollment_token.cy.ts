/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanupAgentPolicies } from '../tasks/cleanup';
import { ENROLLMENT_TOKENS } from '../screens/fleet';

import { API_VERSIONS } from '../../common/constants';
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
    cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_SELECT_FIELD).contains('Agent policy 1');
    cy.get('.euiButton').contains('Create enrollment token').click({ force: true });

    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE, { timeout: 15000 }).contains('Agent policy 1');
  });

  it('Delete Token - inactivates the token', () => {
    cy.visit('app/fleet/enrollment-tokens');
    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE).find('tr').should('have.length', 2);
    cy.getBySel(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN).first().click();
    cy.get('.euiPanel').contains('Are you sure you want to revoke');
    cy.get('.euiButton').contains('Revoke enrollment token').click({ force: true });

    cy.getBySel(ENROLLMENT_TOKENS.LIST_TABLE).within(() => {
      cy.get('.euiTableRow')
        .first()
        .within(() => {
          cy.getBySel(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN).should('not.exist');
        });
    });
  });
});
