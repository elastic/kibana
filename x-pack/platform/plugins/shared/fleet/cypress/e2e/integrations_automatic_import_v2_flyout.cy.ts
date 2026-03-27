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
  INTEGRATION_TITLE_INPUT,
  INTEGRATION_DESCRIPTION_INPUT,
  ADD_DATA_STREAM_BUTTON,
  CREATE_DATA_STREAM_FLYOUT,
  DATA_STREAM_TITLE_INPUT,
  DATA_COLLECTION_METHOD_SELECT,
  LOGS_SOURCE_UPLOAD_CARD,
  LOGS_SOURCE_INDEX_CARD,
  INDEX_SELECT,
  CANCEL_DATA_STREAM_BUTTON,
  ANALYZE_LOGS_BUTTON,
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

const interceptFetchIndices = (indices: unknown[] = []) =>
  cy
    .intercept('GET', '/api/index_management/indices', {
      statusCode: 200,
      body: indices,
    })
    .as('loadIndices');

describe('Add Integration - Automatic Import V2 — Create Data Stream Flyout', () => {
  beforeEach(() => {
    login();
    interceptConnectors();
    interceptGetAllIntegrations();
    interceptFetchIndices();
    cy.visit(CREATE_INTEGRATION_V2_PAGE);
  });

  afterEach(() => {
    deleteConnectors();
  });

  it('should open the create data stream flyout when "Add data stream" is clicked', () => {
    cy.getBySel(ADD_DATA_STREAM_BUTTON).click();
    cy.getBySel(CREATE_DATA_STREAM_FLYOUT).should('be.visible');
  });

  it('should close the flyout when the cancel button is clicked', () => {
    cy.getBySel(ADD_DATA_STREAM_BUTTON).click();
    cy.getBySel(CREATE_DATA_STREAM_FLYOUT).should('be.visible');

    cy.getBySel(CANCEL_DATA_STREAM_BUTTON).click();
    cy.getBySel(CREATE_DATA_STREAM_FLYOUT).should('not.exist');
  });

  it('should have the "Analyze Logs" button disabled when the form is empty', () => {
    cy.getBySel(ADD_DATA_STREAM_BUTTON).click();
    cy.getBySel(ANALYZE_LOGS_BUTTON).should('be.disabled');
  });

  it('should show the file upload card as the default log source', () => {
    cy.getBySel(ADD_DATA_STREAM_BUTTON).click();

    cy.getBySel(LOGS_SOURCE_UPLOAD_CARD).should('be.visible');
    cy.getBySel(INDEX_SELECT).find('input').should('be.disabled');
  });

  it('should reveal the index selector when "Select index" is chosen', () => {
    cy.getBySel(ADD_DATA_STREAM_BUTTON).click();

    cy.getBySel(LOGS_SOURCE_INDEX_CARD).click();
    cy.getBySel(INDEX_SELECT).should('be.visible');
    cy.getBySel(INDEX_SELECT).find('input').should('not.be.disabled');
  });

  it('should hide the index selector and show file upload when toggling back to "Upload file"', () => {
    cy.getBySel(ADD_DATA_STREAM_BUTTON).click();

    cy.getBySel(LOGS_SOURCE_INDEX_CARD).click();
    cy.getBySel(INDEX_SELECT).find('input').should('not.be.disabled');

    cy.getBySel(LOGS_SOURCE_UPLOAD_CARD).click();
    cy.getBySel(INDEX_SELECT).find('input').should('be.disabled');
    cy.getBySel(LOGS_SOURCE_UPLOAD_CARD).should('be.visible');
  });

  it('should enable "Analyze Logs" once title, collection method, and log file are provided', () => {
    cy.getBySel(INTEGRATION_TITLE_INPUT).type('Test Integration');
    cy.getBySel(INTEGRATION_DESCRIPTION_INPUT).type('Test Integration Description');

    cy.getBySel(ADD_DATA_STREAM_BUTTON).click();

    cy.getBySel(DATA_STREAM_TITLE_INPUT).type('Audit Logs');

    cy.getBySel(DATA_COLLECTION_METHOD_SELECT).find('input').click();
    cy.get('[role="option"]').first().click();

    cy.fixture('teleport.ndjson', null).as('logFixture');
    cy.getBySel(CREATE_DATA_STREAM_FLYOUT)
      .find('input[type="file"]')
      .selectFile('@logFixture', { force: true });

    cy.getBySel(ANALYZE_LOGS_BUTTON).should('not.be.disabled');
  });
});
