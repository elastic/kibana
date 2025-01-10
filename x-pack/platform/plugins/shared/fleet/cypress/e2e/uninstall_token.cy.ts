/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UninstallToken } from '../../common/types/models/uninstall_token';

import { cleanupAgentPolicies } from '../tasks/cleanup';
import { UNINSTALL_TOKENS } from '../screens/fleet';
import type { GetUninstallTokenResponse } from '../../common/types/rest_spec/uninstall_token';

import { API_VERSIONS } from '../../common/constants';
import { request } from '../tasks/common';
import { login } from '../tasks/login';

describe('Uninstall token page', () => {
  [true, false].forEach((removePolicies) => {
    describe(`When ${
      removePolicies ? 'removing policies' : 'not removing policies'
    } before checking uninstall tokens`, () => {
      before(() => {
        cleanupAgentPolicies();
        generatePolicies();

        if (removePolicies) {
          cleanupAgentPolicies();
          // Force page refresh after remove policies
          cy.visit('app/fleet/uninstall-tokens');
        }
      });

      after(() => {
        cleanupAgentPolicies();
      });

      beforeEach(() => {
        login();

        cy.visit('app/fleet/uninstall-tokens');
        cy.intercept('GET', 'api/fleet/uninstall_tokens/*').as('getTokenRequest');

        cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)
          .first()
          .then(($policyIdField) => $policyIdField[0].textContent)
          .as('policyIdInFirstLine');
      });

      it('should show token by clicking on the eye button', () => {
        // tokens are hidden by default
        cy.getBySel(UNINSTALL_TOKENS.TOKEN_FIELD).each(($tokenField) => {
          expect($tokenField).to.contain.text('••••••••••••••••••••••••••••••••');
        });

        // token is reveiled when clicking on eye button
        cy.getBySel(UNINSTALL_TOKENS.SHOW_HIDE_TOKEN_BUTTON).first().click();

        // we should show the correct token for the correct policy ID
        waitForFetchingUninstallToken().then((fetchedToken) => {
          cy.get('@policyIdInFirstLine').should('equal', fetchedToken.policy_id);

          cy.getBySel(UNINSTALL_TOKENS.TOKEN_FIELD)
            .first()
            .should('not.contain.text', '••••••••••••••••••••••••••••••••')
            .should('contain.text', fetchedToken.token);
        });
      });

      it("should show flyout by clicking on 'View uninstall command' button", () => {
        cy.getBySel(UNINSTALL_TOKENS.VIEW_UNINSTALL_COMMAND_BUTTON).first().click();

        waitForFetchingUninstallToken().then((fetchedToken) => {
          cy.get('@policyIdInFirstLine').should('equal', fetchedToken.policy_id);

          cy.getBySel(UNINSTALL_TOKENS.UNINSTALL_COMMAND_FLYOUT).should('exist');

          cy.contains(`sudo elastic-agent uninstall --uninstall-token ${fetchedToken.token}`);

          cy.contains(
            `Valid for the following agent policy:${fetchedToken.policy_name || '-'} (${
              fetchedToken.policy_id
            })`
          );
        });
      });

      it('should filter for policy ID by partial match', () => {
        cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).should('have.length.at.least', 3);

        cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_SEARCH_FIELD).type('licy-300');

        cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).should('have.length', 1);
      });

      if (!removePolicies) {
        it('should filter for policy name by partial match', () => {
          cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).should('have.length.at.least', 3);

          cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_SEARCH_FIELD).type('Agent 200');

          cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).should('have.length', 1);
        });
      } else {
        it('should not be able to filter for policy name by partial match', () => {
          cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).should('have.length.at.least', 3);

          cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_SEARCH_FIELD).type('Agent 200');

          cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).should('have.length', 0);
        });
      }
    });
  });

  const generatePolicies = () => {
    for (let i = 1; i <= 3; i++) {
      request({
        method: 'POST',
        url: '/api/fleet/agent_policies',
        body: { name: `Agent policy ${i}00`, namespace: 'default', id: `agent-policy-${i}00` },
        headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
      });
    }
  };

  const waitForFetchingUninstallToken = (): Cypress.Chainable<UninstallToken> =>
    cy
      .wait('@getTokenRequest')
      .then((interception) => (interception.response?.body as GetUninstallTokenResponse).item);
});
