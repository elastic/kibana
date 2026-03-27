/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../tasks/login';
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
  CONNECTOR_SETUP_FLYOUT,
  INTEGRATION_TITLE_INPUT,
  INTEGRATION_DESCRIPTION_INPUT,
  BUTTON_FOOTER_ACTION,
  BUTTON_FOOTER_CANCEL,
} from '../screens/integrations_automatic_import_v2';

const mockBedrockConnector = {
  connectorId: bedrockId,
  type: '.bedrock',
  name: bedrockConnectorAPIPayload.name,
  config: bedrockConnectorAPIPayload.config,
  isPreconfigured: false,
  isInferenceEndpoint: false,
  capabilities: {},
};

const interceptConnectors = (connectors: unknown[] = [mockBedrockConnector]) =>
  cy
    .intercept('GET', '/internal/inference/connectors', {
      statusCode: 200,
      body: { connectors },
    })
    .as('loadConnectors');

const interceptGetAllIntegrations = (integrations: unknown[] = []) =>
  cy
    .intercept('GET', '/api/automatic_import_v2/integrations', {
      statusCode: 200,
      body: integrations,
    })
    .as('loadIntegrations');

describe('Add Integration - Automatic Import V2 — Connector & Form', () => {
  beforeEach(() => {
    login();
  });

  afterEach(() => {
    deleteConnectors();
  });

  // =========================================================================
  // Connector Selector
  // =========================================================================

  describe('Connector Selector', () => {
    it('should display connector after loading when AI connectors are available', () => {
      interceptConnectors([mockBedrockConnector]);
      interceptGetAllIntegrations();
      cy.visit(CREATE_INTEGRATION_V2_PAGE);

      cy.getBySel(CONNECTOR_SELECTOR_LOADING).should('not.exist');
      cy.getBySel(CONNECTOR_SELECTOR)
        .should('be.visible')
        .and('contain.text', bedrockConnectorAPIPayload.name);
    });

    it('should show "Add new connector" button when no AI connectors are available', () => {
      interceptConnectors([]);
      interceptGetAllIntegrations();
      cy.visit(CREATE_INTEGRATION_V2_PAGE);

      cy.getBySel(CONNECTOR_SELECTOR_LOADING).should('not.exist');
      cy.getBySel(ADD_NEW_CONNECTOR_BUTTON).should('be.visible');
      cy.getBySel(CONNECTOR_SELECTOR).should('not.exist');
    });

    it('should open the connector setup flyout when "Add new connector" is clicked', () => {
      interceptConnectors([]);
      interceptGetAllIntegrations();
      cy.visit(CREATE_INTEGRATION_V2_PAGE);

      cy.getBySel(ADD_NEW_CONNECTOR_BUTTON).click();
      cy.getBySel(CONNECTOR_SETUP_FLYOUT).should('be.visible');
    });
  });

  // =========================================================================
  // Integration Details Form
  // =========================================================================

  describe('Integration Details Form', () => {
    beforeEach(() => {
      interceptConnectors();
      interceptGetAllIntegrations();
      cy.visit(CREATE_INTEGRATION_V2_PAGE);
    });

    it('should render the title and description input fields', () => {
      cy.getBySel(INTEGRATION_TITLE_INPUT).should('be.visible');
      cy.getBySel(INTEGRATION_DESCRIPTION_INPUT).should('be.visible');
    });

    it('should allow entering integration title and description', () => {
      cy.getBySel(INTEGRATION_TITLE_INPUT).type('My Custom Integration');
      cy.getBySel(INTEGRATION_DESCRIPTION_INPUT).type('Parses custom log format');

      cy.getBySel(INTEGRATION_TITLE_INPUT).should('have.value', 'My Custom Integration');
      cy.getBySel(INTEGRATION_DESCRIPTION_INPUT).should('have.value', 'Parses custom log format');
    });

    it('should have the "Done" action button disabled when no data streams have been added', () => {
      cy.getBySel(BUTTON_FOOTER_ACTION).should('be.disabled');
    });

    it('should display the cancel button', () => {
      cy.getBySel(BUTTON_FOOTER_CANCEL).should('be.visible');
    });
  });
});
