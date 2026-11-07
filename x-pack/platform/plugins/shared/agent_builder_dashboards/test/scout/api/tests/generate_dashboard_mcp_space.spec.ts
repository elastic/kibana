/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  answerNextLayoutCall,
  callGenerateDashboard,
  dashboardAuthorRole,
  inSpace,
  markdownPanel,
  pinProxyConnector,
  readDashboard,
  resultOfType,
  testData,
  withMcpClient,
  type DashboardToolResult,
} from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);
const SPACE_ID = `ab-dashboards-mcp-${RUN_ID}`;

apiTest.describe(
  'generate_dashboard tool over MCP (non-default space)',
  { tag: tags.stateful.classic },
  () => {
    let credentials: RoleApiCredentials;
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, kbnClient, layoutModel }) => {
      await kbnClient.spaces.create({ id: SPACE_ID, name: 'Agent Builder dashboards MCP' });
      await pinProxyConnector(kbnClient, layoutModel.proxy, SPACE_ID);
      credentials = await requestAuth.getApiKeyForCustomRole(dashboardAuthorRole(SPACE_ID));
      adminCredentials = await requestAuth.getApiKeyForAdmin();
    });

    apiTest.afterEach(({ layoutModel }) => {
      layoutModel.proxy.clear();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.spaces.delete(SPACE_ID);
    });

    apiTest(
      'saves the dashboard in the space of the MCP URL and links to it there',
      async ({ apiClient, kbnUrl, layoutModel }) => {
        const title = `Space dashboard ${RUN_ID}`;
        const text = `In space ${RUN_ID}`;

        answerNextLayoutCall(layoutModel.proxy);
        const envelope = await withMcpClient(
          {
            url: kbnUrl.get(inSpace(testData.MCP_PATH, SPACE_ID)),
            headers: credentials.apiKeyHeader,
          },
          (client) =>
            callGenerateDashboard(client, { title, panels: [markdownPanel('note', text)] })
        );
        const { dashboard_id: dashboardId, url } = resultOfType<DashboardToolResult>(
          envelope,
          'dashboard'
        );

        expect(url).toContain(`/s/${SPACE_ID}/app/dashboards#/view/${dashboardId}`);

        const saved = await readDashboard(apiClient, credentials, dashboardId, SPACE_ID);
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.data.title).toBe(title);
        expect(saved.body.data.panels).toStrictEqual([
          expect.objectContaining({
            type: 'markdown',
            config: expect.objectContaining({ content: text }),
          }),
        ]);

        const inDefaultSpace = await readDashboard(apiClient, adminCredentials, dashboardId);
        expect(inDefaultSpace).toHaveStatusCode(404);
      }
    );
  }
);
