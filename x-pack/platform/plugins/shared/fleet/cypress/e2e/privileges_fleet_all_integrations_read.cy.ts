/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET, INTEGRATIONS, navigateTo } from '../tasks/navigation';
import {
  createUsersAndRoles,
  FleetAllIntegrReadRole,
  FleetAllIntegrReadUser,
  deleteUsersAndRoles,
} from '../tasks/privileges';
import { login, loginWithUserAndWaitForPage, logout } from '../tasks/login';
import { navigateToTab, createAgentPolicy } from '../tasks/fleet';
import { cleanupAgentPolicies, unenrollAgent } from '../tasks/cleanup';
import { getIntegrationCard } from '../screens/integrations';

import {
  AGENT_POLICIES_TAB,
  AGENT_POLICY_SAVE_INTEGRATION,
  ADD_PACKAGE_POLICY_BTN,
} from '../screens/fleet';
import { ADD_INTEGRATION_POLICY_BTN, AGENT_POLICY_NAME_LINK } from '../screens/integrations';
import { scrollToIntegration } from '../tasks/integrations';

const rolesToCreate = [FleetAllIntegrReadRole];
const usersToCreate = [FleetAllIntegrReadUser];

describe('When the user has All privilege for Fleet but Read for integrations', () => {
  before(() => {
    login();
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  after(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
  });

  afterEach(() => {
    logout();
  });

  describe('When there are agent policies', () => {
    before(() => {
      navigateTo(FLEET);
      createAgentPolicy();
    });

    it('Some elements in the UI are not enabled', () => {
      logout();
      loginWithUserAndWaitForPage(FLEET, FleetAllIntegrReadUser);
      navigateToTab(AGENT_POLICIES_TAB);

      cy.getBySel(AGENT_POLICY_NAME_LINK).click();
      cy.getBySel(ADD_PACKAGE_POLICY_BTN).should('be.disabled');

      cy.get('a[title="system-1"]').click();
      cy.getBySel(AGENT_POLICY_SAVE_INTEGRATION).should('be.disabled');
    });

    after(() => {
      unenrollAgent();
      cleanupAgentPolicies();
    });
  });

  describe('Integrations', () => {
    it('are visible but cannot be added', () => {
      loginWithUserAndWaitForPage(INTEGRATIONS, FleetAllIntegrReadUser);
      scrollToIntegration(getIntegrationCard('apache'));
      cy.getBySel(getIntegrationCard('apache')).click();
      cy.getBySel(ADD_INTEGRATION_POLICY_BTN).should('be.disabled');
    });
  });
});
