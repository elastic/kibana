/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../tasks/login';
import {
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

const interceptGetAllIntegrations = (integrations: unknown[] = [mockReadyIntegration]) =>
  cy
    .intercept('GET', '/api/automatic_import_v2/integrations', {
      statusCode: 200,
      body: integrations,
    })
    .as('loadIntegrations');

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
