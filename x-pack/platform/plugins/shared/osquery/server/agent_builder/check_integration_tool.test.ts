/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { checkIntegrationTool } from './check_integration_tool';
import { buildToolContext, toolRequest } from './test_helpers';

describe('checkIntegrationTool agent_id handling', () => {
  it('escapes KQL metacharacters in the caller-supplied agent_id', async () => {
    const { context, listAgents } = buildToolContext({
      grantedPrivileges: ['osquery-read'],
    });
    const tool = checkIntegrationTool(context, loggerMock.create());

    await tool.handler({ agent_id: 'agent-"1" or agent.id:"*\\' }, {
      request: toolRequest,
      spaceId: 'default',
    } as never);

    const kuery = (listAgents.mock.calls[0][0] as { kuery: string }).kuery;
    expect(kuery).toContain('agent.id:"agent-\\"1\\"');
    expect(kuery).toContain('agent.id:\\"\\*\\\\"');
  });

  it('does not report capability when the kuery matched a different agent', async () => {
    const { context } = buildToolContext({
      grantedPrivileges: ['osquery-read'],
      agents: [{ id: 'some-other-agent-entirely' }],
      agentsTotal: 1,
    });
    const tool = checkIntegrationTool(context, loggerMock.create());

    const result = (await tool.handler({ agent_id: 'agent-*' }, {
      request: toolRequest,
      spaceId: 'default',
    } as never)) as {
      results: Array<{ data: { agent_osquery_capable?: boolean; enrollment_status?: string } }>;
    };

    const data = result.results[0].data;
    expect(data.agent_osquery_capable).toBe(false);
    expect(data.enrollment_status).toBe('not_enrolled');
  });

  it('reports capability when the list returns the exact requested agent', async () => {
    const { context } = buildToolContext({
      grantedPrivileges: ['osquery-read'],
      agents: [{ id: 'ad2681a0-1a5b-4b42-9a5f-000000000001', status: 'online' }],
      agentsTotal: 1,
    });
    const tool = checkIntegrationTool(context, loggerMock.create());

    const result = (await tool.handler({ agent_id: 'ad2681a0-1a5b-4b42-9a5f-000000000001' }, {
      request: toolRequest,
      spaceId: 'default',
    } as never)) as {
      results: Array<{ data: { agent_osquery_capable?: boolean; enrollment_status?: string } }>;
    };

    const data = result.results[0].data;
    expect(data.agent_osquery_capable).toBe(true);
    expect(data.enrollment_status).toBe('enrolled');
  });

  it('passes a plain agent id through unchanged', async () => {
    const { context, listAgents } = buildToolContext({
      grantedPrivileges: ['osquery-read'],
    });
    const tool = checkIntegrationTool(context, loggerMock.create());

    await tool.handler({ agent_id: 'ad2681a0-1a5b-4b42-9a5f-000000000001' }, {
      request: toolRequest,
      spaceId: 'default',
    } as never);

    const kuery = (listAgents.mock.calls[0][0] as { kuery: string }).kuery;
    expect(kuery).toContain('agent.id:"ad2681a0-1a5b-4b42-9a5f-000000000001"');
  });
});
