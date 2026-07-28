/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { loggerMock } from '@kbn/logging-mocks';
import { createGithubCodeResearchTools } from './tools';
import {
  GITHUB_LIST_REPOS_TOOL_ID,
  GITHUB_MCP_CONNECTOR_ID,
  GITHUB_SEARCH_CODE_TOOL_ID,
} from './constants';
import { getGithubSearchRateReport, resetGithubSearchRateReport } from './search_rate_tracker';

describe('GitHub Code Intelligence tools', () => {
  const execute = jest.fn();
  const server = {
    actions: {
      getActionsClientWithRequest: jest.fn(async () => ({ execute })),
    },
  } as unknown as StreamsServer;
  const context = agentBuilderMocks.tools.createHandlerContext();

  beforeEach(() => {
    jest.clearAllMocks();
    resetGithubSearchRateReport('default');
  });

  it('returns the hardcoded OpenTelemetry Demo repository', async () => {
    const tools = createGithubCodeResearchTools({ server, logger: loggerMock.create() });
    const listRepos = tools.find(
      ({ id }) => id === GITHUB_LIST_REPOS_TOOL_ID
    ) as BuiltinToolDefinition;
    const result = await listRepos.handler({}, context);
    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            repositories: [{ repository: 'open-telemetry/opentelemetry-demo', ref: '2.2.0' }],
          },
        },
      ],
    });
  });

  it('proxies and measures search_code', async () => {
    execute.mockResolvedValue({ status: 'ok', data: { content: [] } });
    const tools = createGithubCodeResearchTools({ server, logger: loggerMock.create() });
    const search = tools.find(
      ({ id }) => id === GITHUB_SEARCH_CODE_TOOL_ID
    ) as BuiltinToolDefinition;

    await search.handler(
      {
        query: 'logger repo:open-telemetry/opentelemetry-demo path:src/checkout',
        phase: 'logging-sites',
        serviceName: 'checkoutservice',
      },
      context
    );

    expect(execute).toHaveBeenCalledWith({
      actionId: GITHUB_MCP_CONNECTOR_ID,
      params: {
        subAction: 'callTool',
        subActionParams: {
          name: 'search_code',
          arguments: {
            query: 'logger repo:open-telemetry/opentelemetry-demo path:src/checkout',
          },
        },
      },
    });
    expect(getGithubSearchRateReport('default')).toMatchObject({
      total: 1,
      byPhase: { 'service-discovery': 0, 'logging-sites': 1, unknown: 0 },
      byService: { checkoutservice: 1 },
    });
  });
});
