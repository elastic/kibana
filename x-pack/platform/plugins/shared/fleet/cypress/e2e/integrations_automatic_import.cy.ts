/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteIntegrations } from '../tasks/integrations';
import {
  UPLOAD_PACKAGE_LINK,
  ASSISTANT_BUTTON,
  CREATE_INTEGRATION_LANDING_PAGE,
  BUTTON_FOOTER_NEXT,
  INTEGRATION_TITLE_INPUT,
  INTEGRATION_DESCRIPTION_INPUT,
  DATASTREAM_TITLE_INPUT,
  DATASTREAM_DESCRIPTION_INPUT,
  DATASTREAM_NAME_INPUT,
  DATA_COLLECTION_METHOD_INPUT,
  LOGS_SAMPLE_FILE_PICKER,
  EDIT_PIPELINE_BUTTON,
  SAVE_PIPELINE_BUTTON,
  VIEW_INTEGRATION_BUTTON,
  INTEGRATION_SUCCESS_SECTION,
  SAVE_ZIP_BUTTON,
  CEL_GENERATION_FLYOUT_BUTTON,
  API_DEFINITION_FILE_PICKER,
  ANLAYZE_API_BUTTON,
  GENERATE_CEL_BUTTON,
  SAVE_CEL_CONFIG_BUTTON,
} from '../screens/integrations_automatic_import';
import { cleanupAgentPolicies } from '../tasks/cleanup';
import { login, logout } from '../tasks/login';
import { createBedrockConnector, deleteConnectors } from '../tasks/api_calls/connectors';
import {
  ecsResultsForJson,
  categorizationResultsForJson,
  relatedResultsForJson,
  analyzeApiResults,
  celInputResults,
} from '../tasks/api_calls/graph_results';

describe('Add Integration - Automatic Import', () => {
  beforeEach(() => {
    login();

    cleanupAgentPolicies();
    deleteIntegrations();

    // Create a mock connector
    deleteConnectors();
    createBedrockConnector();
    // Mock API Responses
    cy.intercept('POST', '/internal/automatic_import/analyzeapi', {
      statusCode: 200,
      body: {
        results: analyzeApiResults,
      },
    });
    cy.intercept('POST', '/internal/automatic_import/cel', {
      statusCode: 200,
      body: {
        results: celInputResults,
      },
    });
    cy.intercept('POST', '/internal/automatic_import/ecs', {
      statusCode: 200,
      body: {
        results: ecsResultsForJson,
      },
    });
    cy.intercept('POST', '/internal/automatic_import/categorization', {
      statusCode: 200,
      body: {
        results: categorizationResultsForJson,
      },
    });
    cy.intercept('POST', '/internal/automatic_import/related', {
      statusCode: 200,
      body: {
        results: relatedResultsForJson,
      },
    });
  });

  afterEach(() => {
    deleteConnectors();
    cleanupAgentPolicies();
    deleteIntegrations();
    logout();
  });

  it('should create an integration', () => {
    cy.visit(CREATE_INTEGRATION_LANDING_PAGE);

    cy.getBySel(ASSISTANT_BUTTON).should('exist');
    cy.getBySel(UPLOAD_PACKAGE_LINK).should('exist');

    // Create Automatic Import Page
    cy.getBySel(ASSISTANT_BUTTON).click();
    cy.getBySel(BUTTON_FOOTER_NEXT).click();

    // Integration details Page
    cy.getBySel(INTEGRATION_TITLE_INPUT).type('Test Integration');
    cy.getBySel(INTEGRATION_DESCRIPTION_INPUT).type('Test Integration Description');
    cy.getBySel(BUTTON_FOOTER_NEXT).click();

    // Datastream details page
    cy.getBySel(DATASTREAM_TITLE_INPUT).type('Audit');
    cy.getBySel(DATASTREAM_DESCRIPTION_INPUT).type('Test Datastream Description');
    cy.getBySel(DATASTREAM_NAME_INPUT).type('audit');
    cy.getBySel(DATA_COLLECTION_METHOD_INPUT).type('api (cel input)');
    cy.get('body').click(0, 0);
    cy.getBySel(CEL_GENERATION_FLYOUT_BUTTON).click();

    // CEL generation flyout
    cy.fixture('openapi.yaml', null).as('myOpenApiFixture');
    cy.getBySel(API_DEFINITION_FILE_PICKER).selectFile('@myOpenApiFixture');
    cy.getBySel(ANLAYZE_API_BUTTON).click();
    cy.getBySel(GENERATE_CEL_BUTTON).click();
    cy.getBySel(SAVE_CEL_CONFIG_BUTTON).click();

    // Select sample logs file and Analyze logs
    cy.fixture('teleport.ndjson', null).as('myLogsFixture');
    cy.getBySel(LOGS_SAMPLE_FILE_PICKER).selectFile('@myLogsFixture');
    cy.getBySel(BUTTON_FOOTER_NEXT).click();

    // Edit Pipeline
    cy.getBySel(EDIT_PIPELINE_BUTTON).click();
    cy.getBySel(SAVE_PIPELINE_BUTTON).click();

    // Deploy
    cy.getBySel(BUTTON_FOOTER_NEXT).click();
    cy.getBySel(INTEGRATION_SUCCESS_SECTION).should('exist');
    cy.getBySel(SAVE_ZIP_BUTTON).should('exist');

    // View Integration
    cy.getBySel(VIEW_INTEGRATION_BUTTON).click();
  });
});
