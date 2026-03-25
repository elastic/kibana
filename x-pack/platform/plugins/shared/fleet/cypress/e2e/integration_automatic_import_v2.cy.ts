/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, logout } from '../tasks/login';
import {
  deleteConnectors,
  bedrockConnectorAPIPayload,
  bedrockId,
} from '../tasks/api_calls/connectors';
import {
  CREATE_INTEGRATION_V2_PAGE,
  CONNECTOR_SELECTOR,
  CONNECTOR_SELECTOR_LOADING,
  ADD_NEW_CONNECTOR_BUTTON,
} from '../screens/integrations_automatic_import_v2';

// Minimal connector shape matching what GET /api/actions/connectors returns
const mockBedrockConnector = {
  id: bedrockId,
  actionTypeId: '.bedrock',
  name: bedrockConnectorAPIPayload.name,
  isMissingSecrets: false,
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  config: bedrockConnectorAPIPayload.config,
};

describe('Add Integration - Automatic Import V2', () => {
  beforeEach(() => {
    login();
    deleteConnectors();
  });

  afterEach(() => {
    deleteConnectors();
    logout();
  });

  describe('Connector Selector', () => {
    it('should display connector after loading when AI connectors are available', () => {
      cy.intercept('GET', '/api/actions/connectors', {
        statusCode: 200,
        body: [mockBedrockConnector],
      }).as('loadConnectors');

      cy.visit(CREATE_INTEGRATION_V2_PAGE);

      cy.getBySel(CONNECTOR_SELECTOR_LOADING).should('not.exist');
      cy.getBySel(CONNECTOR_SELECTOR)
        .should('be.visible')
        .and('contain.text', bedrockConnectorAPIPayload.name);
    });

    it('should show "Add new connector" button when no AI connectors are available', () => {
      cy.intercept('GET', '/api/actions/connectors', {
        statusCode: 200,
        body: [],
      }).as('loadConnectors');

      cy.visit(CREATE_INTEGRATION_V2_PAGE);

      cy.getBySel(CONNECTOR_SELECTOR_LOADING).should('not.exist');
      cy.getBySel(ADD_NEW_CONNECTOR_BUTTON).should('be.visible');
      cy.getBySel(CONNECTOR_SELECTOR).should('not.exist');
    });
  });
});
