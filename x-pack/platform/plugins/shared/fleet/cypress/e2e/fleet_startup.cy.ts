/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENTS_TAB,
  ADD_AGENT_BUTTON_TOP,
  AGENT_FLYOUT,
  CREATE_FLEET_SERVER_POLICY_BTN,
  AGENT_POLICY_CREATE_STATUS_CALLOUT,
  ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON,
  ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON,
  FLEET_SERVER_SETUP,
  LANDING_PAGE_ADD_FLEET_SERVER_BUTTON,
} from '../screens/fleet';
import { cleanupAgentPolicies, unenrollAgent } from '../tasks/cleanup';
import { request } from '../tasks/common';
import { verifyPolicy, verifyAgentPackage, navigateToTab } from '../tasks/fleet';
import { setFleetServerHost } from '../tasks/fleet_server';
import { login } from '../tasks/login';
import { FLEET, navigateTo } from '../tasks/navigation';

describe('Fleet startup', () => {
  describe('Create policies', () => {
    before(() => {
      unenrollAgent();
      cleanupAgentPolicies();
      setFleetServerHost();
    });

    after(() => {
      cleanupAgentPolicies();
    });

    beforeEach(() => {
      login();
      navigateTo(FLEET);
    });

    it('should have no agent policy by default', () => {
      request({ url: '/api/fleet/agent_policies?full=true' }).then((response: any) => {
        expect(response.body.items.length).to.equal(0);
      });
    });

    it('should create agent policy', () => {
      cy.getBySel(ADD_AGENT_BUTTON_TOP).click();
      cy.getBySel(AGENT_FLYOUT.STANDALONE_TAB).click();

      cy.intercept('POST', '/api/fleet/agent_policies?sys_monitoring=true').as('createAgentPolicy');

      cy.getBySel(AGENT_FLYOUT.CREATE_POLICY_BUTTON, { timeout: 10000 }).click();

      let agentPolicyId: string;
      const startTime = Date.now();
      cy.wait('@createAgentPolicy', { timeout: 180000 }).then((xhr: any) => {
        cy.log('Create agent policy took: ' + (Date.now() - startTime) / 1000 + ' s');
        agentPolicyId = xhr.response.body.item.id;

        // verify create button changed to dropdown
        cy.getBySel(AGENT_FLYOUT.POLICY_DROPDOWN);

        // verify agent.yml code block has new policy id
        cy.getBySel(AGENT_FLYOUT.AGENT_POLICY_CODE_BLOCK).contains(`id: ${agentPolicyId}`);

        cy.getBySel(AGENT_FLYOUT.CLOSE_BUTTON).click();

        // verify policy is created and has system package
        verifyPolicy('Agent policy 1', ['System']);

        verifyAgentPackage();
      });
    });

    it('should create Fleet Server policy', () => {
      cy.getBySel(LANDING_PAGE_ADD_FLEET_SERVER_BUTTON).click();

      cy.getBySel(AGENT_FLYOUT.ADVANCED_TAB_BUTTON).click();
      cy.getBySel(CREATE_FLEET_SERVER_POLICY_BTN, { timeout: 180000 }).click();

      // Wait until the success callout is shown before navigating away
      cy.getBySel(AGENT_POLICY_CREATE_STATUS_CALLOUT)
        .should('exist')
        .and('have.class', 'euiCallOut--success');
      cy.getBySel(AGENT_FLYOUT.CLOSE_BUTTON).click();

      // verify policy is created and has fleet server and system package
      verifyPolicy('Fleet Server policy 1', ['Fleet Server', 'System']);

      // Reopen Flyout
      navigateToTab(AGENTS_TAB);
      cy.getBySel(LANDING_PAGE_ADD_FLEET_SERVER_BUTTON).click();
      cy.getBySel(AGENT_FLYOUT.ADVANCED_TAB_BUTTON).click();

      // verify create button changed to dropdown
      cy.getBySel(AGENT_FLYOUT.POLICY_DROPDOWN);

      // verify fleet server enroll command contains created policy id
      cy.getBySel(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
      cy.getBySel(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();
      cy.getBySel(FLEET_SERVER_SETUP.NAME_INPUT).type('New host');
      cy.get('[placeholder="Specify host URL"').type('https://localhost:8220');

      cy.getBySel(ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON).click();
      cy.getBySel(ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON).click();
      cy.get('.euiCodeBlock__code').contains('--fleet-server-policy=fleet-server-policy');
    });
  });
});
