/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import { checkIntegrationTool } from './check_integration_tool';
import { buildToolContext, toolRequest } from './test_helpers';

describe('checkIntegrationTool agent_id handling', () => {
  it('escapes KQL metacharacters in the caller-supplied agent_id', async () => {
    const { context, listAgents } = buildToolContext({
      grantedPrivileges: ['osquery-read'],
    });
    const tool = checkIntegrationTool(context, loggerMock.create());

    // `"` and `\` would break out of the KQL quoted string and turn the
    // enrollment check into a malformed or widened query.
    await tool.handler({ agent_id: 'agent-"1" or agent.id:"*\\' }, {
      request: toolRequest,
      spaceId: 'default',
    } as never);

    const kuery = (listAgents.mock.calls[0][0] as { kuery: string }).kuery;
    expect(kuery).toContain('agent.id:"agent-\\"1\\" or agent.id:\\"*\\\\"');
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

  describe('failed installation lookup', () => {
    const run = async (getInstallation: jest.Mock) => {
      const { context } = buildToolContext({ grantedPrivileges: ['osquery-read'] });
      (context.service.getPackageService as jest.Mock).mockReturnValue({
        asInternalUser: { getInstallation },
      });
      const result = await checkIntegrationTool(context, loggerMock.create()).handler({}, {
        request: toolRequest,
        spaceId: 'default',
      } as never);
      if (!isToolHandlerStandardReturn(result)) {
        throw new Error('Expected standard handler return');
      }

      return result.results[0].data as Record<string, unknown>;
    };

    it('does not claim the integration is not installed when the lookup throws', async () => {
      const data = await run(jest.fn().mockRejectedValue(new Error('fleet down')));

      expect(data.enrollment_status).toBe('unknown');
      expect(data).not.toHaveProperty('installed');
      expect(String(data.error)).toContain('fleet down');
    });

    it('still reports installed: false when the lookup succeeds with no package (negative control)', async () => {
      const data = await run(jest.fn().mockResolvedValue(undefined));

      expect(data).toMatchObject({ installed: false, enrollment_status: 'not_enrolled' });
    });
  });
});
