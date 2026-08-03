/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  createOAuthClient,
  createUiamAuthHeaders,
  revokeOAuthClient,
  uniqueClientName,
} from '../../../scout_agent_builder_shared/lib/oauth_clients_kbn';
import { test } from '../fixtures';

// Failing: See https://github.com/elastic/kibana/issues/277343
test.describe.skip(
  '[NON-MKI] Agent Builder — MCP Clients management',
  { tag: ['@local-serverless-search'] },
  () => {
    let authHeaders: Record<string, string>;
    const createdClientIds: string[] = [];

    test.beforeAll(async ({ samlAuth }) => {
      authHeaders = await createUiamAuthHeaders(samlAuth);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiClient }) => {
      await Promise.all(
        createdClientIds.map((id) => revokeOAuthClient(apiClient, authHeaders, id))
      );
      createdClientIds.length = 0;
    });

    test('opens the MCP Clients page from the Manage MCP menu', async ({ page, pageObjects }) => {
      await pageObjects.agentBuilder.navigateToToolsLanding();
      await pageObjects.agentBuilder.openManageMcpClientsFromMenu();
      await expect(page.testSubj.locator('agentBuilderMcpClientsListPage')).toBeVisible();
      await expect(page.testSubj.locator('agentBuilderMcpClientsListTable')).toBeVisible();
    });

    test('registers a public client and surfaces its details without a secret', async ({
      page,
      pageObjects,
    }) => {
      const clientName = uniqueClientName('scout-public');

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.openMcpClientCreate();
      await pageObjects.agentBuilder.fillMcpClientName(clientName);
      await pageObjects.agentBuilder.selectMcpClientLogo();
      const clientId = await pageObjects.agentBuilder.submitMcpClientCreate();
      createdClientIds.push(clientId);

      const modal = page.testSubj.locator('mcpClientDetailsModal');
      await expect(modal).toContainText('Client ID');
      await expect(modal).toContainText('api/agent_builder/mcp');
      await expect(modal.getByText('MCP client secret', { exact: false })).toHaveCount(0);

      await pageObjects.agentBuilder.closeMcpClientDetails();
      await pageObjects.agentBuilder.searchMcpClients(clientName);
      await expect(page.getByRole('button', { name: clientName, exact: true })).toBeVisible();

      await pageObjects.agentBuilder.openMcpClientDetailsFlyoutByName(clientName);
      await expect(
        page.testSubj.locator('mcpClientDetailsFlyout').getByTestId('mcpClientLogo')
      ).toBeVisible();
      await pageObjects.agentBuilder.closeMcpClientDetails();
    });

    test('registers a confidential client and reveals its secret in the post-create modal', async ({
      page,
      pageObjects,
    }) => {
      const clientName = uniqueClientName('scout-confidential');

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.openMcpClientCreate();
      await pageObjects.agentBuilder.fillMcpClientName(clientName);
      await pageObjects.agentBuilder.setMcpClientConfidential(true);
      const clientId = await pageObjects.agentBuilder.submitMcpClientCreate();
      createdClientIds.push(clientId);

      const modal = page.testSubj.locator('mcpClientDetailsModal');
      await expect(modal.getByText('MCP client secret', { exact: false })).toBeVisible();

      await pageObjects.agentBuilder.closeMcpClientDetails();
    });

    test('filters the client list by search term and status', async ({
      apiClient,
      page,
      pageObjects,
    }) => {
      const activeName = uniqueClientName('scout-active');
      const active = await createOAuthClient(apiClient, authHeaders, {
        clientName: activeName,
        clientType: 'public',
      });
      createdClientIds.push(active.id);

      const revokedName = uniqueClientName('scout-revoked');
      const revoked = await createOAuthClient(apiClient, authHeaders, {
        clientName: revokedName,
        clientType: 'public',
      });
      createdClientIds.push(revoked.id);
      await revokeOAuthClient(apiClient, authHeaders, revoked.id);

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.waitForMcpClientRow(active.id);
      await pageObjects.agentBuilder.waitForMcpClientRow(revoked.id);

      const activeRow = page.testSubj.locator(`agentBuilderMcpClientsListRow-${active.id}`);
      const revokedRow = page.testSubj.locator(`agentBuilderMcpClientsListRow-${revoked.id}`);

      await pageObjects.agentBuilder.searchMcpClients(activeName);
      await expect(activeRow).toBeVisible();
      await expect(revokedRow).not.toBeAttached();

      await pageObjects.agentBuilder.clearMcpClientsSearch();
      await pageObjects.agentBuilder.toggleMcpClientsStatusFilter('Active');
      await expect(activeRow).toBeVisible();
      await expect(revokedRow).not.toBeAttached();

      await pageObjects.agentBuilder.toggleMcpClientsStatusFilter('Active');
      await pageObjects.agentBuilder.toggleMcpClientsStatusFilter('Revoked');
      await expect(revokedRow).toBeVisible();
      await expect(activeRow).not.toBeAttached();
    });

    test('opens the details flyout from a client name link', async ({
      apiClient,
      page,
      pageObjects,
    }) => {
      const clientName = uniqueClientName('scout-details');
      const client = await createOAuthClient(apiClient, authHeaders, {
        clientName,
        clientType: 'public',
      });
      createdClientIds.push(client.id);

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.searchMcpClients(clientName);
      await pageObjects.agentBuilder.waitForMcpClientRow(client.id);
      await pageObjects.agentBuilder.openMcpClientDetailsFlyout(client.id);

      const flyout = page.testSubj.locator('mcpClientDetailsFlyout');
      await expect(flyout).toContainText(client.id);
      await expect(flyout).toContainText('api/agent_builder/mcp');

      await pageObjects.agentBuilder.closeMcpClientDetails();
    });

    test('revokes a client through the row actions menu', async ({ apiClient, pageObjects }) => {
      const clientName = uniqueClientName('scout-revoke');
      const client = await createOAuthClient(apiClient, authHeaders, {
        clientName,
        clientType: 'public',
      });
      createdClientIds.push(client.id);

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.searchMcpClients(clientName);
      await pageObjects.agentBuilder.waitForMcpClientRow(client.id);

      await pageObjects.agentBuilder.openMcpClientRevokeModal(client.id);
      await pageObjects.agentBuilder.confirmMcpClientRevoke(clientName);

      await expect(async () => {
        const status = await pageObjects.agentBuilder.getMcpClientRowStatus(client.id);
        expect(status).toContain('Revoked');
      }).toPass();
    });
  }
);
