/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ensureGithubMcpConnector } from './ensure_connector';
import { GITHUB_MCP_TOOL_NAMES } from './constants';

describe('ensureGithubMcpConnector', () => {
  const get = jest.fn();
  const create = jest.fn();
  const server = {
    actions: {
      getActionsClientWithRequest: jest.fn(async () => ({ get, create })),
    },
  } as unknown as StreamsServer;
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();

  beforeEach(() => jest.clearAllMocks());

  it('creates the editable connector without credentials when it is absent', async () => {
    get.mockRejectedValue({ output: { statusCode: 404 } });
    create.mockResolvedValue({ id: 'github-mcp' });

    await expect(ensureGithubMcpConnector({ server, request, logger })).resolves.toEqual({
      created: true,
      needsConfigurationUpdate: false,
    });
    expect(create).toHaveBeenCalledWith({
      action: {
        name: 'GitHub MCP',
        actionTypeId: '.mcp',
        config: {
          serverUrl: 'https://api.githubcopilot.com/mcp/',
          hasAuth: true,
          authType: 'bearer',
          headers: {
            'X-MCP-Tools': GITHUB_MCP_TOOL_NAMES.join(','),
            'X-MCP-Readonly': 'true',
            'X-MCP-Insiders': 'false',
          },
        },
        secrets: {},
      },
      options: { id: 'github-mcp' },
    });
  });

  it('preserves an existing expected connector', async () => {
    get.mockResolvedValue({
      actionTypeId: '.mcp',
      config: {
        serverUrl: 'https://api.githubcopilot.com/mcp/',
        headers: {
          'X-MCP-Tools': GITHUB_MCP_TOOL_NAMES.join(','),
          'X-MCP-Readonly': 'true',
        },
      },
    });

    await expect(ensureGithubMcpConnector({ server, request, logger })).resolves.toEqual({
      created: false,
      needsConfigurationUpdate: false,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('reports an outdated tool allow-list without overwriting credentials', async () => {
    get.mockResolvedValue({
      actionTypeId: '.mcp',
      config: {
        serverUrl: 'https://api.githubcopilot.com/mcp/',
        headers: { 'X-MCP-Tools': 'search_code', 'X-MCP-Readonly': 'true' },
      },
    });

    await expect(ensureGithubMcpConnector({ server, request, logger })).resolves.toEqual({
      created: false,
      needsConfigurationUpdate: true,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a conflicting connector', async () => {
    get.mockResolvedValue({ actionTypeId: '.mcp', config: { serverUrl: 'https://example.com' } });
    await expect(ensureGithubMcpConnector({ server, request, logger })).rejects.toThrow(
      'is not the expected read-only GitHub MCP connector'
    );
  });
});
