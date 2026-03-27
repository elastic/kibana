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
  ADD_DATA_STREAM_BUTTON,
  CREATE_DATA_STREAM_FLYOUT,
  DATA_STREAM_TITLE_INPUT,
  DATA_COLLECTION_METHOD_SELECT,
  LOGS_SOURCE_UPLOAD_CARD,
  LOGS_SOURCE_INDEX_CARD,
  INDEX_SELECT,
  CANCEL_DATA_STREAM_BUTTON,
  ANALYZE_LOGS_BUTTON,
  MANAGE_INTEGRATIONS_V2_PAGE,
  MANAGE_INTEGRATIONS_TABLE,
  MANAGE_INTEGRATIONS_TABLE_ERROR,
  MANAGE_INTEGRATIONS_SEARCH_INPUT,
  MANAGE_INTEGRATION_ACTIONS_BTN,
  MANAGE_INTEGRATION_REVIEW_APPROVE_MENU_ITEM,
  MANAGE_INTEGRATION_INSTALL_MENU_ITEM,
  MANAGE_INTEGRATION_DOWNLOAD_ZIP_MENU_ITEM,
  MANAGE_INTEGRATION_EDIT_MENU_ITEM,
  MANAGE_INTEGRATION_DELETE_MENU_ITEM,
  MANAGE_INTEGRATION_REVIEW_APPROVE_INLINE_BTN,
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

const mockReadyIntegration = {
  integrationId: 'my-cypress-integration',
  title: 'My Cypress Integration',
  version: '1.0.0',
  totalDataStreamCount: 2,
  successfulDataStreamCount: 2,
  createdBy: 'elastic',
  status: 'completed',
};

const mockApprovedIntegration = {
  ...mockReadyIntegration,
  integrationId: 'approved-integration',
  title: 'Approved Integration',
  status: 'approved',
};

const mockPendingIntegration = {
  integrationId: 'pending-integration',
  title: 'Pending Integration',
  version: '1.0.0',
  totalDataStreamCount: 1,
  successfulDataStreamCount: 0,
  createdBy: 'elastic',
  status: 'pending',
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

const interceptFleetPackages = () =>
  cy
    .intercept('GET', '/api/fleet/epm/packages*', {
      statusCode: 200,
      body: { items: [] },
    })
    .as('loadFleetPackages');

const interceptDeleteIntegration = (integrationId: string) =>
  cy
    .intercept('DELETE', `/api/automatic_import_v2/integrations/${integrationId}`, {
      statusCode: 200,
      body: {},
    })
    .as('deleteIntegration');

const interceptDownloadZip = (integrationId: string) =>
  cy
    .intercept('GET', `/api/automatic_import_v2/integrations/${integrationId}/download`, {
      statusCode: 200,
      headers: { 'content-disposition': `attachment; filename="${integrationId}.zip"` },
      body: '',
    })
    .as('downloadZip');

const interceptInstallToCluster = (integrationId: string) => {
  interceptDownloadZip(integrationId);
  cy.intercept('POST', '/api/fleet/epm/packages', {
    statusCode: 200,
    body: { items: [] },
  }).as('installPackage');
};

const interceptGetIntegrationDetails = (integrationId: string) =>
  cy
    .intercept('GET', `/api/automatic_import_v2/integrations/${integrationId}`, {
      statusCode: 200,
      body: {
        integrationResponse: {
          title: 'My Cypress Integration',
          version: '1.0.0',
          dataStreams: [
            {
              dataStreamId: 'audit',
              title: 'Audit Logs',
              description: 'Audit log data stream',
              inputTypes: [{ name: 'filestream' }],
              status: 'completed',
            },
          ],
        },
      },
    })
    .as('getIntegrationDetails');

// =========================================================================
// Connector & Form
// =========================================================================

describe('Add Integration - Automatic Import V2 — Connector & Form', () => {
  beforeEach(() => {
    login();
  });

  afterEach(() => {
    deleteConnectors();
  });

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

describe('Add Integration - Automatic Import V2 — Create Data Stream Flyout', () => {
  beforeEach(() => {
    login();
    interceptConnectors();
    interceptGetAllIntegrations();
    interceptFetchIndices();
    cy.visit(CREATE_INTEGRATION_V2_PAGE);
    cy.wait('@loadConnectors');
    cy.getBySel(CONNECTOR_SELECTOR).should('contain.text', bedrockConnectorAPIPayload.name);
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

describe('Add Integration - Automatic Import V2 — Manage Integrations Table', () => {
  beforeEach(() => {
    login();
    interceptFleetPackages();
  });

  describe('Table rendering', () => {
    it('should display integration rows in the table', () => {
      interceptGetAllIntegrations([mockReadyIntegration, mockPendingIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('be.visible');
      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('contain.text', 'My Cypress Integration');
      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('contain.text', 'Pending Integration');
    });

    it('should show the data stream count badge', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('contain.text', '2/2');
    });

    it('should show the inline Review & Approve button for ready integrations', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_REVIEW_APPROVE_INLINE_BTN).should('be.visible');
    });

    it('should show an empty table when there are no integrations', () => {
      interceptGetAllIntegrations([]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('be.visible');
      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('contain.text', 'No items found');
    });
  });

  describe('Search', () => {
    it('should filter rows by search input', () => {
      interceptGetAllIntegrations([mockReadyIntegration, mockPendingIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATIONS_SEARCH_INPUT).type('Pending');

      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('contain.text', 'Pending Integration');
      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('not.contain.text', 'My Cypress Integration');
    });
  });

  describe('Actions menu', () => {
    it('should show all menu items when the actions button is clicked', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();

      cy.getBySel(MANAGE_INTEGRATION_REVIEW_APPROVE_MENU_ITEM).should('exist');
      cy.getBySel(MANAGE_INTEGRATION_INSTALL_MENU_ITEM).should('exist');
      cy.getBySel(MANAGE_INTEGRATION_DOWNLOAD_ZIP_MENU_ITEM).should('exist');
      cy.getBySel(MANAGE_INTEGRATION_EDIT_MENU_ITEM).should('exist');
      cy.getBySel(MANAGE_INTEGRATION_DELETE_MENU_ITEM).should('exist');
    });

    it('should disable Install and enable Download for a ready (not yet approved) integration', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();

      cy.getBySel(MANAGE_INTEGRATION_INSTALL_MENU_ITEM).should('have.attr', 'disabled');
      cy.getBySel(MANAGE_INTEGRATION_DOWNLOAD_ZIP_MENU_ITEM).should('not.have.attr', 'disabled');
    });

    it('should enable Install and disable Review & Approve for an approved integration', () => {
      interceptGetAllIntegrations([mockApprovedIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();

      cy.getBySel(MANAGE_INTEGRATION_INSTALL_MENU_ITEM).should('not.have.attr', 'disabled');
      cy.getBySel(MANAGE_INTEGRATION_REVIEW_APPROVE_MENU_ITEM).should('have.attr', 'disabled');
    });

    it('should disable Review & Approve and Download for a pending integration', () => {
      interceptGetAllIntegrations([mockPendingIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();

      cy.getBySel(MANAGE_INTEGRATION_REVIEW_APPROVE_MENU_ITEM).should('have.attr', 'disabled');
      cy.getBySel(MANAGE_INTEGRATION_DOWNLOAD_ZIP_MENU_ITEM).should('have.attr', 'disabled');
    });
  });

  describe('Delete', () => {
    it('should delete an integration after confirmation', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);
      interceptDeleteIntegration(mockReadyIntegration.integrationId);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      interceptGetAllIntegrations([]);

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();
      cy.getBySel(MANAGE_INTEGRATION_DELETE_MENU_ITEM).click();
      cy.get('[data-test-subj="confirmModalConfirmButton"]').click();

      cy.wait('@deleteIntegration');
    });

    it('should cancel delete and keep the integration in the table', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();
      cy.getBySel(MANAGE_INTEGRATION_DELETE_MENU_ITEM).click();
      cy.get('[data-test-subj="confirmModalCancelButton"]').click();

      cy.getBySel(MANAGE_INTEGRATIONS_TABLE).should('contain.text', 'My Cypress Integration');
    });
  });

  describe('Review & Approve', () => {
    it('should open the review modal from the actions menu', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);
      interceptGetIntegrationDetails(mockReadyIntegration.integrationId);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();
      cy.getBySel(MANAGE_INTEGRATION_REVIEW_APPROVE_MENU_ITEM).click();

      cy.wait('@getIntegrationDetails');
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('should open the review modal from the inline button', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);
      interceptGetIntegrationDetails(mockReadyIntegration.integrationId);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_REVIEW_APPROVE_INLINE_BTN).first().click();

      cy.wait('@getIntegrationDetails');
      cy.get('[role="dialog"]').should('be.visible');
    });
  });

  describe('Install', () => {
    it('should install an approved integration to the cluster', () => {
      interceptGetAllIntegrations([mockApprovedIntegration]);
      interceptInstallToCluster(mockApprovedIntegration.integrationId);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();
      cy.getBySel(MANAGE_INTEGRATION_INSTALL_MENU_ITEM).click();

      cy.wait('@downloadZip');
      cy.wait('@installPackage');
    });
  });

  describe('Download .zip', () => {
    it('should trigger the download request when Download .zip is clicked', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);
      interceptDownloadZip(mockReadyIntegration.integrationId);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();
      cy.getBySel(MANAGE_INTEGRATION_DOWNLOAD_ZIP_MENU_ITEM).click();

      cy.wait('@downloadZip');
    });
  });

  describe('Edit', () => {
    it('should navigate to the integration edit page when Edit is clicked', () => {
      interceptGetAllIntegrations([mockReadyIntegration]);

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrations');

      cy.getBySel(MANAGE_INTEGRATION_ACTIONS_BTN).first().click();
      cy.getBySel(MANAGE_INTEGRATION_EDIT_MENU_ITEM).click();

      cy.url().should('include', `/edit/${mockReadyIntegration.integrationId}`);
    });
  });

  describe('Error state', () => {
    it('should show an error callout when the integrations API fails', () => {
      cy.intercept('GET', '/api/automatic_import_v2/integrations', {
        statusCode: 500,
        body: { message: 'Internal Server Error' },
      }).as('loadIntegrationsFail');

      cy.visit(MANAGE_INTEGRATIONS_V2_PAGE);
      cy.wait('@loadIntegrationsFail');

      cy.getBySel(MANAGE_INTEGRATIONS_TABLE_ERROR).should('be.visible');
    });
  });
});
