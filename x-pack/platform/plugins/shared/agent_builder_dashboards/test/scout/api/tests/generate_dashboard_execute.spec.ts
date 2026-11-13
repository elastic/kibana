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
import { dashboardTools } from '../../../../common/constants';
import {
  apiTest,
  answerNextLayoutCall,
  dashboardAuthorRole,
  deleteDashboards,
  markdownPanel,
  readDashboard,
  resultOfType,
  testData,
  type DashboardToolResult,
  type ToolResultEnvelope,
} from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);

apiTest.describe(
  'generate_dashboard tool over POST /api/agent_builder/tools/_execute',
  { tag: tags.stateful.classic },
  () => {
    let credentials: RoleApiCredentials;
    const createdIds = new Set<string>();

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(dashboardAuthorRole('default'));
    });

    apiTest.afterEach(({ layoutModel }) => {
      layoutModel.proxy.clear();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteDashboards(kbnClient, createdIds);
    });

    apiTest(
      'saves a dashboard with the given connector and returns its id and url',
      async ({ apiClient, layoutModel }) => {
        const title = `Execute dashboard ${RUN_ID}`;
        const text = `Executed ${RUN_ID}`;

        answerNextLayoutCall(layoutModel.proxy);
        const response = await apiClient.post(testData.EXECUTE_TOOL_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
          body: {
            tool_id: dashboardTools.generateDashboard,
            connector_id: layoutModel.connectorId,
            tool_params: { title, panels: [markdownPanel('note', text)] },
          },
        });
        expect(response).toHaveStatusCode(200);

        const { dashboard_id: dashboardId, url } = resultOfType<DashboardToolResult>(
          response.body as ToolResultEnvelope,
          'dashboard'
        );
        createdIds.add(dashboardId);
        expect(url).toContain(`/app/dashboards#/view/${dashboardId}`);

        const saved = await readDashboard(apiClient, credentials, dashboardId);
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.data.title).toBe(title);
        expect(saved.body.data.panels).toStrictEqual([
          expect.objectContaining({
            type: 'markdown',
            config: expect.objectContaining({ content: text }),
          }),
        ]);
      }
    );
  }
);
