/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteTestOAuthConnection, seedTestOAuthConnection } from '@kbn/mock-idp-utils';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import {
  createOAuthClient,
  createUiamAuthHeaders,
  revokeOAuthClient,
  uniqueClientName,
} from '../fixtures/oauth_seed';

const MCP_RESOURCE = 'http://localhost:5620/api/agent_builder/mcp';

test.describe(
  '[NON-MKI] Security — Application Connections management',
  { tag: ['@local-serverless-security_complete'] },
  () => {
    let authHeaders: Record<string, string>;
    let clientId: string;
    const connectionIds: string[] = [];

    test.beforeAll(async ({ apiClient, samlAuth, config: { organizationId } }) => {
      authHeaders = await createUiamAuthHeaders(samlAuth);

      const meResponse = await apiClient.get('internal/security/me', {
        headers: authHeaders,
        responseType: 'json',
      });
      const { username: userId }: { username: string } = meResponse.body;

      const client = await createOAuthClient(apiClient, authHeaders, {
        clientName: uniqueClientName(),
        clientType: 'public',
      });
      clientId = client.id;

      // Seed six connections: two for the view test, one each for inline edit
      // and individual revoke, and two for the bulk revoke test. Distinct
      // connections keep the (serially executed) tests independent.
      for (let index = 0; index < 6; index++) {
        const connectionId = `scout-conn-${Date.now()}-${index}`;
        const result = await seedTestOAuthConnection({
          connectionId,
          clientId,
          organizationId: organizationId!,
          userId,
          resource: MCP_RESOURCE,
          name: `scout connection ${index}`,
          scopes: ['all'],
        });
        if (!result.success) {
          throw new Error(`Failed to seed OAuth connection: ${result.message}`);
        }
        connectionIds.push(connectionId);
      }
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiClient }) => {
      await Promise.all(
        connectionIds.map((connectionId) => deleteTestOAuthConnection({ connectionId, clientId }))
      );
      if (clientId) {
        await revokeOAuthClient(apiClient, authHeaders, clientId);
      }
    });

    test('shows connections in grouped and list views', async ({ page, pageObjects }) => {
      const { applicationConnections } = pageObjects;
      await applicationConnections.navigate();

      await applicationConnections.switchToGroupedView();
      await applicationConnections.waitForGroupedClientRow(clientId);
      await applicationConnections.expandClientRow(clientId);
      await expect(
        page.testSubj.locator(`applicationConnectionsChildTable-${clientId}`)
      ).toBeVisible();

      await applicationConnections.switchToListView();
      await expect(
        page.testSubj.locator(`applicationConnectionsListViewRow-${connectionIds[0]}`)
      ).toBeVisible();
      await expect(
        page.testSubj.locator(`applicationConnectionsListViewRow-${connectionIds[1]}`)
      ).toBeVisible();
    });

    test('edits a connection name inline and persists it', async ({ page, pageObjects }) => {
      const connectionId = connectionIds[2];
      const newName = `renamed-${Date.now()}`;

      await pageObjects.applicationConnections.navigate();
      await pageObjects.applicationConnections.switchToListView();
      await pageObjects.applicationConnections.waitForListConnectionRow(connectionId);
      await pageObjects.applicationConnections.editConnectionName(connectionId, newName);

      await pageObjects.applicationConnections.navigate();
      await pageObjects.applicationConnections.switchToListView();
      await pageObjects.applicationConnections.waitForListConnectionRow(connectionId);
      await expect(page.getByText(newName)).toBeVisible();
    });

    test('revokes an individual connection', async ({ pageObjects }) => {
      const connectionId = connectionIds[3];

      await pageObjects.applicationConnections.navigate();
      await pageObjects.applicationConnections.switchToListView();
      await pageObjects.applicationConnections.waitForListConnectionRow(connectionId);
      await pageObjects.applicationConnections.revokeConnection(connectionId);

      await expect(async () => {
        const rowText = await pageObjects.applicationConnections.getListConnectionRowText(
          connectionId
        );
        expect(rowText).toContain('Revoked');
      }).toPass();
    });

    test('bulk revokes multiple selected connections', async ({ pageObjects }) => {
      const bulkConnectionIds = [connectionIds[4], connectionIds[5]];

      await pageObjects.applicationConnections.navigate();
      await pageObjects.applicationConnections.switchToListView();
      for (const connectionId of bulkConnectionIds) {
        await pageObjects.applicationConnections.waitForListConnectionRow(connectionId);
        await pageObjects.applicationConnections.selectListConnectionRow(connectionId);
      }

      await pageObjects.applicationConnections.bulkRevokeSelected();

      for (const connectionId of bulkConnectionIds) {
        await expect(async () => {
          const rowText = await pageObjects.applicationConnections.getListConnectionRowText(
            connectionId
          );
          expect(rowText).toContain('Revoked');
        }).toPass();
      }
    });
  }
);
