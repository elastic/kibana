/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { createClient, type AgentClient } from './client';
import { createPersistedProviderFn } from './provider';

jest.mock('./client');

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

describe('persisted agent provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the default agent id when it is missing from optimized id results', async () => {
    const ensureDefaultAgent = jest.fn().mockResolvedValue({ id: agentBuilderDefaultAgentId });
    createClientMock.mockResolvedValue({
      getIds: jest.fn().mockResolvedValue(['custom-agent']),
      ensureDefaultAgent,
    } as unknown as AgentClient);

    const providerFactory = createPersistedProviderFn({
      security: {} as never,
      elasticsearch: {} as never,
      toolsService: {} as never,
      logger: {} as never,
    });
    const provider = await providerFactory({ request: {} as never, space: 'default' });

    await expect(provider.getIds({})).resolves.toEqual([
      'custom-agent',
      agentBuilderDefaultAgentId,
    ]);
    expect(ensureDefaultAgent).toHaveBeenCalledTimes(1);
  });
});
