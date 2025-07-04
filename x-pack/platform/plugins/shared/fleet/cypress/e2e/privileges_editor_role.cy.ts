/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET, INTEGRATIONS, navigateTo } from '../tasks/navigation';
import { createUsers, BuiltInEditorUser, deleteUsers } from '../tasks/privileges';
import { login, loginWithUserAndWaitForPage, logout } from '../tasks/login';

import { getIntegrationCard } from '../screens/integrations';

import { ADD_AGENT_BUTTON, FLEET_SERVER_MISSING_PRIVILEGES } from '../screens/fleet';
import { ADD_INTEGRATION_POLICY_BTN } from '../screens/integrations';
import { scrollToIntegration } from '../tasks/integrations';

const usersToCreate = [BuiltInEditorUser];

// This role behaves like Fleet > All, Integrations > All
describe('When the user has Editor built-in role', () => {
  before(() => {
    createUsers(usersToCreate);
  });

  beforeEach(() => {
    login();
  });

  afterEach(() => {
    logout();
  });

  after(() => {
    deleteUsers(usersToCreate);
  });

  describe('Fleet app', () => {
    before(() => {
      navigateTo(FLEET);
    });

    it('It should not show a callout if fleet server is setup', () => {
      cy.intercept('GET', '/api/fleet/agents/setup', {
        body: {
          isReady: true,
          is_secrets_storage_enabled: true,
          missing_requirements: [],
          missing_optional_features: [],
        },
      });
      loginWithUserAndWaitForPage(FLEET, BuiltInEditorUser);
      cy.getBySel(ADD_AGENT_BUTTON).should('exist');
    });

    it('It should not show a callout with missing manage_service_accout if fleet server is not setup', () => {
      cy.intercept('GET', '/api/fleet/agents/setup', {
        body: {
          isReady: true,
          is_secrets_storage_enabled: true,
          missing_requirements: ['fleet_server'],
          missing_optional_features: [],
        },
      });
      loginWithUserAndWaitForPage(FLEET, BuiltInEditorUser);
      cy.getBySel(FLEET_SERVER_MISSING_PRIVILEGES.PROMPT).should('exist');
    });
  });

  describe('Integrations app', () => {
    it('are visible and can be added', () => {
      loginWithUserAndWaitForPage(INTEGRATIONS, BuiltInEditorUser);
      scrollToIntegration(getIntegrationCard('apache'));
      cy.getBySel(getIntegrationCard('apache')).click();
      cy.getBySel(ADD_INTEGRATION_POLICY_BTN).should('not.be.disabled');
    });
  });
});
