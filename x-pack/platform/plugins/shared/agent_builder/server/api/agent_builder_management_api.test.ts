/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

import { AgentBuilderManagementApi } from './agent_builder_management_api';

describe('AgentBuilderManagementApi', () => {
  const logger = {
    warn: jest.fn(),
  } as unknown as Logger;

  const createRequest = (): KibanaRequest =>
    ({
      headers: {},
    }) as KibanaRequest;

  it('uses the agentBuilder start contract from getStartServices', async () => {
    const createOrUpdate = jest.fn().mockResolvedValue({ id: 'agent-1' });
    const has = jest.fn().mockResolvedValue(false);
    const getRegistry = jest.fn().mockResolvedValue({ has, create: createOrUpdate });

    const getStartServices = jest.fn().mockResolvedValue([
      {},
      {},
      {
        agents: {
          getRegistry,
        },
      },
    ]);

    const api = new AgentBuilderManagementApi(getStartServices, logger);

    await api.createOrUpdateAgent(
      {
        id: 'agent-1',
        name: 'Agent 1',
        description: 'Test agent',
        configuration: {
          tools: [{ tool_ids: ['platform.core.execute_esql'] }],
        },
      },
      createRequest()
    );

    expect(getStartServices).toHaveBeenCalled();
    expect(getRegistry).toHaveBeenCalled();
    expect(createOrUpdate).toHaveBeenCalled();
  });
});
