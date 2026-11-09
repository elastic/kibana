/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionResult } from '@kbn/actions-plugin/server';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import { getMcpToolsHealth } from './mcp_tools_health';

const createConnector = ({
  id,
  actionTypeId = MCP_CONNECTOR_TYPE_ID,
}: {
  id: string;
  actionTypeId?: string;
}): ActionResult => ({
  id,
  name: id,
  actionTypeId,
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
});

const createListToolsResult = (
  actionId: string,
  toolNames: string[]
): ActionTypeExecutorResult<unknown> => ({
  actionId,
  status: 'ok',
  data: { tools: toolNames.map((name) => ({ name, inputSchema: {} })) },
});

const createMcpTool = (id: string, connectorId: string, toolName: string) => ({
  id,
  configuration: { connector_id: connectorId, tool_name: toolName },
});

describe('getMcpToolsHealth', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  const connectors = new Map<string, ActionResult>();
  const listToolsResults = new Map<string, ActionTypeExecutorResult<unknown>>();

  beforeEach(() => {
    connectors.clear();
    listToolsResults.clear();

    actionsClient = actionsClientMock.create();
    actionsClient.get.mockImplementation(async ({ id }) => {
      const connector = connectors.get(id);
      if (!connector) {
        throw new Error(`Saved object [action/${id}] not found`);
      }
      return connector;
    });
    actionsClient.execute.mockImplementation(
      async ({ actionId }) =>
        listToolsResults.get(actionId) ?? { actionId, status: 'error', message: 'Unexpected call' }
    );
  });

  it('loads and lists each connector once, reporting healthy and missing tools', async () => {
    connectors.set('mcp-connector', createConnector({ id: 'mcp-connector' }));
    listToolsResults.set('mcp-connector', createListToolsResult('mcp-connector', ['search']));

    const results = await getMcpToolsHealth({
      actionsClient,
      mcpTools: [
        createMcpTool('tool-search', 'mcp-connector', 'search'),
        createMcpTool('tool-missing', 'mcp-connector', 'missing'),
      ],
      healthStates: [],
    });

    expect(results).toEqual([
      {
        toolId: 'tool-search',
        connectorId: 'mcp-connector',
        mcpToolName: 'search',
        status: 'healthy',
      },
      {
        toolId: 'tool-missing',
        connectorId: 'mcp-connector',
        mcpToolName: 'missing',
        status: 'tool_not_found',
        errorMessage: "Tool 'missing' not found on MCP server",
      },
    ]);
    expect(actionsClient.get).toHaveBeenCalledTimes(1);
    expect(actionsClient.execute).toHaveBeenCalledTimes(1);
  });

  it('reports connector_not_found when the connector does not exist', async () => {
    const results = await getMcpToolsHealth({
      actionsClient,
      mcpTools: [createMcpTool('tool-search', 'deleted-connector', 'search')],
      healthStates: [],
    });

    expect(results).toEqual([
      {
        toolId: 'tool-search',
        connectorId: 'deleted-connector',
        mcpToolName: 'search',
        status: 'connector_not_found',
        errorMessage: "Connector 'deleted-connector' not found",
      },
    ]);
    expect(actionsClient.execute).not.toHaveBeenCalled();
  });

  it('reports connector_not_found without listing tools when the connector is not an MCP connector', async () => {
    connectors.set(
      'swapped-connector',
      createConnector({ id: 'swapped-connector', actionTypeId: '.pagerduty_mcp' })
    );

    const results = await getMcpToolsHealth({
      actionsClient,
      mcpTools: [createMcpTool('tool-search', 'swapped-connector', 'search')],
      healthStates: [],
    });

    expect(results).toEqual([
      {
        toolId: 'tool-search',
        connectorId: 'swapped-connector',
        mcpToolName: 'search',
        status: 'connector_not_found',
        errorMessage: `Connector 'swapped-connector' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '.pagerduty_mcp'`,
      },
    ]);
    expect(actionsClient.execute).not.toHaveBeenCalled();
  });

  it('reports list_tools_failed when listing tools fails', async () => {
    connectors.set('mcp-connector', createConnector({ id: 'mcp-connector' }));
    listToolsResults.set('mcp-connector', {
      actionId: 'mcp-connector',
      status: 'error',
      message: 'MCP server unreachable',
    });

    const results = await getMcpToolsHealth({
      actionsClient,
      mcpTools: [createMcpTool('tool-search', 'mcp-connector', 'search')],
      healthStates: [],
    });

    expect(results).toEqual([
      {
        toolId: 'tool-search',
        connectorId: 'mcp-connector',
        mcpToolName: 'search',
        status: 'list_tools_failed',
        errorMessage: 'MCP server unreachable',
      },
    ]);
  });

  it('reports tool_unhealthy when the tool has failed health checks', async () => {
    connectors.set('mcp-connector', createConnector({ id: 'mcp-connector' }));
    listToolsResults.set('mcp-connector', createListToolsResult('mcp-connector', ['search']));

    const results = await getMcpToolsHealth({
      actionsClient,
      mcpTools: [createMcpTool('tool-search', 'mcp-connector', 'search')],
      healthStates: [{ toolId: 'tool-search', status: 'failed', errorMessage: 'Timed out' }],
    });

    expect(results).toEqual([
      {
        toolId: 'tool-search',
        connectorId: 'mcp-connector',
        mcpToolName: 'search',
        status: 'tool_unhealthy',
        errorMessage: 'Timed out',
      },
    ]);
  });
});
