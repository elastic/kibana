/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  createTestMcpServer,
  type McpServerSimulator,
} from '../../../../scout_agent_builder_shared/lib/mcp_server_simulator';
import {
  createMcpConnectorViaKbn,
  deleteAllConnectors,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { apiTest } from '../fixtures';

apiTest.describe(
  'MCP connector — tools with outputSchema',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let mcpServer: McpServerSimulator;
    let connectorId: string;

    apiTest.beforeAll(async ({ kbnClient }) => {
      mcpServer = createTestMcpServer();
      await mcpServer.start();
      const connector = await createMcpConnectorViaKbn(kbnClient, mcpServer.getUrl());
      connectorId = connector.id;
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteAllConnectors(kbnClient);
      await mcpServer.stop();
    });

    apiTest(
      'listTools succeeds when server advertises tools with outputSchema',
      async ({ asAdmin }) => {
        const response = await asAdmin.post(
          `/api/actions/connector/${encodeURIComponent(connectorId)}/_execute`,
          {
            body: {
              params: {
                subAction: 'listTools',
                subActionParams: { forceRefresh: true },
              },
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);

        const body = response.body;

        const toolNames = body.data.tools.map((t: { name: string }) => t.name);
        expect(toolNames).toContain('get_weather');
        expect(toolNames).toContain('echo');
      }
    );
  }
);
