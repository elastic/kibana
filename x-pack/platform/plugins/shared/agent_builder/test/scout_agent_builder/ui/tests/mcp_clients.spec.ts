/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createOAuthClient,
  createUiamAuthHeaders,
  revokeOAuthClient,
  uniqueClientName,
} from '../../../scout_agent_builder_shared/lib/oauth_clients_kbn';
import { test } from '../fixtures';

test.describe(
  '[NON-MKI] Agent Builder — MCP Clients management',
  { tag: [...tags.serverless.search] },
  () => {
    let authHeaders: Record<string, string>;
    const seededClientIds: string[] = [];

    test.beforeAll(async ({ samlAuth }) => {
      authHeaders = await createUiamAuthHeaders(samlAuth);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiClient }) => {
      await Promise.all(seededClientIds.map((id) => revokeOAuthClient(apiClient, authHeaders, id)));
      seededClientIds.length = 0;
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
      await pageObjects.agentBuilder.submitMcpClientCreate();

      await pageObjects.agentBuilder.waitForMcpClientDetailsModal();
      expect(await pageObjects.agentBuilder.mcpClientDetailsModalContainsText('Client ID')).toBe(
        true
      );
      expect(
        await pageObjects.agentBuilder.mcpClientDetailsModalContainsText('api/agent_builder/mcp')
      ).toBe(true);
      expect(await pageObjects.agentBuilder.mcpClientDetailsModalHasSecretField()).toBe(false);

      await pageObjects.agentBuilder.closeMcpClientDetails();
      await pageObjects.agentBuilder.searchMcpClients(clientName);
      await expect(page.getByRole('button', { name: clientName, exact: true })).toBeVisible({
        timeout: 60_000,
      });

      await pageObjects.agentBuilder.openMcpClientDetailsFlyoutByName(clientName);
      expect(await pageObjects.agentBuilder.mcpClientDetailsFlyoutHasLogo()).toBe(true);
      await pageObjects.agentBuilder.closeMcpClientDetails();
    });

    test('registers a confidential client and reveals its secret in the post-create modal', async ({
      pageObjects,
    }) => {
      const clientName = uniqueClientName('scout-confidential');

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.openMcpClientCreate();
      await pageObjects.agentBuilder.fillMcpClientName(clientName);
      await pageObjects.agentBuilder.setMcpClientConfidential(true);
      await pageObjects.agentBuilder.submitMcpClientCreate();

      await pageObjects.agentBuilder.waitForMcpClientDetailsModal();
      expect(await pageObjects.agentBuilder.mcpClientDetailsModalHasSecretField()).toBe(true);

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
      seededClientIds.push(active.id);

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.waitForMcpClientRow(active.id);

      await pageObjects.agentBuilder.searchMcpClients(activeName);
      await expect(page.testSubj.locator(`agentBuilderMcpClientsListRow-${active.id}`)).toBeVisible(
        { timeout: 60_000 }
      );

      await pageObjects.agentBuilder.clearMcpClientsSearch();
      await pageObjects.agentBuilder.filterMcpClientsByStatus('Active');
      await expect(page.testSubj.locator(`agentBuilderMcpClientsListRow-${active.id}`)).toBeVisible(
        { timeout: 60_000 }
      );
    });

    test('opens the details flyout from a client name link', async ({ apiClient, pageObjects }) => {
      const clientName = uniqueClientName('scout-details');
      const client = await createOAuthClient(apiClient, authHeaders, {
        clientName,
        clientType: 'public',
      });
      seededClientIds.push(client.id);

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.searchMcpClients(clientName);
      await pageObjects.agentBuilder.waitForMcpClientRow(client.id);
      await pageObjects.agentBuilder.openMcpClientDetailsFlyout(client.id);

      expect(await pageObjects.agentBuilder.mcpClientDetailsFlyoutContainsText(client.id)).toBe(
        true
      );
      expect(
        await pageObjects.agentBuilder.mcpClientDetailsFlyoutContainsText('api/agent_builder/mcp')
      ).toBe(true);

      await pageObjects.agentBuilder.closeMcpClientDetails();
    });

    test('revokes a client through the row actions menu', async ({ apiClient, pageObjects }) => {
      const clientName = uniqueClientName('scout-revoke');
      const client = await createOAuthClient(apiClient, authHeaders, {
        clientName,
        clientType: 'public',
      });
      seededClientIds.push(client.id);

      await pageObjects.agentBuilder.navigateToMcpClients();
      await pageObjects.agentBuilder.searchMcpClients(clientName);
      await pageObjects.agentBuilder.waitForMcpClientRow(client.id);

      await pageObjects.agentBuilder.openMcpClientRevokeModal(client.id);
      await pageObjects.agentBuilder.confirmMcpClientRevoke(clientName);

      await expect(async () => {
        const status = await pageObjects.agentBuilder.getMcpClientRowStatus(client.id);
        expect(status).toContain('Revoked');
      }).toPass({ timeout: 60_000 });
    });
  }
);
