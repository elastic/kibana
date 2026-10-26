/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { COMMON_HEADERS } from './constants';
import { pinProxyConnector } from './helpers';

export interface LayoutModel {
  proxy: LlmProxy;
  connectorId: string;
}

interface AgentBuilderDashboardsApiWorkerFixtures extends ScoutWorkerFixtures {
  layoutModel: LayoutModel;
}

export const apiTest = baseApiTest.extend<
  ScoutTestFixtures,
  AgentBuilderDashboardsApiWorkerFixtures
>({
  layoutModel: [
    async ({ kbnClient, log }, use) => {
      const proxy = await createLlmProxy(log);
      const previousDefault = await kbnClient.uiSettings.get(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
      const connectorId = await pinProxyConnector(kbnClient, proxy);

      await use({ proxy, connectorId });

      if (typeof previousDefault === 'string') {
        await kbnClient.uiSettings.update({
          [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: previousDefault,
        });
      } else {
        await kbnClient.uiSettings.unset(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
      }
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/actions/connector/${encodeURIComponent(connectorId)}`,
        headers: COMMON_HEADERS,
        ignoreErrors: [404],
      });
      proxy.close();
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
export {
  GENERATE_DASHBOARD_MCP_NAME,
  answerNextLayoutCall,
  callGenerateDashboard,
  createAppDashboard,
  dashboardAuthorRole,
  deleteDashboards,
  inSpace,
  markdownPanel,
  pinProxyConnector,
  readAppDashboard,
  readDashboard,
  resultOfType,
  withMcpClient,
  type DashboardToolResult,
  type ToolResultEnvelope,
} from './helpers';
