/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { MAX_BULK_GET_ATTACHMENTS } from '../../../../common/constants';
import { createBulkGetAgentBuilderConversationsRoute } from './bulk_get_agent_builder_conversations';

describe('bulk get agent builder conversations route', () => {
  const bulkGet = jest.fn();
  const getScopedClient = jest.fn().mockResolvedValue({ bulkGet });
  const agentBuilder = { conversations: { getScopedClient } } as unknown as AgentBuilderPluginStart;
  const route = createBulkGetAgentBuilderConversationsRoute({
    getAgentBuilder: async () => agentBuilder,
  });

  const callRoute = (body: unknown) => {
    const request = { body };
    const response = { ok: jest.fn() };
    return route
      .handler({ context: {}, request, response } as unknown as Parameters<typeof route.handler>[0])
      .then(() => ({ request, response }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires the Agent Builder read privilege', () => {
    expect(route.security).toEqual({
      authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
    });
  });

  it('returns only the conversations Agent Builder resolved for the requester', async () => {
    bulkGet.mockResolvedValue(
      new Map([['c-1', { id: 'c-1', title: 'Triage', agent_id: 'agent-1', rounds: [] }]])
    );

    const { request, response } = await callRoute({ ids: ['c-1', 'c-hidden'] });

    expect(getScopedClient).toHaveBeenCalledWith({ request });
    expect(bulkGet).toHaveBeenCalledWith(['c-1', 'c-hidden']);
    expect(response.ok).toHaveBeenCalledWith({
      body: { conversations: [{ id: 'c-1', title: 'Triage', agent_id: 'agent-1' }] },
    });
  });

  it('rejects an empty id list', async () => {
    await expect(callRoute({ ids: [] })).rejects.toThrow();
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it(`rejects more than ${MAX_BULK_GET_ATTACHMENTS} ids`, async () => {
    await expect(
      callRoute({ ids: Array.from({ length: MAX_BULK_GET_ATTACHMENTS + 1 }, (_, i) => `c-${i}`) })
    ).rejects.toThrow();
    expect(bulkGet).not.toHaveBeenCalled();
  });
});
