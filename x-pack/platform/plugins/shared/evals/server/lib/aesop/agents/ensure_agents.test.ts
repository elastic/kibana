/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureAesopAgents } from './ensure_agents';
import { AESOP_AGENTS } from './agent_definitions';

describe('ensureAesopAgents', () => {
  const mockRegistry = {
    has: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    bulkGet: jest.fn(),
  };
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates agents that do not exist', async () => {
    mockRegistry.has.mockResolvedValue(false);
    mockRegistry.create.mockResolvedValue({ id: 'test' });

    await ensureAesopAgents(mockRegistry as any, mockLogger);

    expect(mockRegistry.create).toHaveBeenCalledTimes(AESOP_AGENTS.length);
  });

  it('skips agents that already exist', async () => {
    mockRegistry.has.mockResolvedValue(true);

    await ensureAesopAgents(mockRegistry as any, mockLogger);

    expect(mockRegistry.create).not.toHaveBeenCalled();
  });

  it('continues if one agent creation fails', async () => {
    mockRegistry.has.mockResolvedValue(false);
    mockRegistry.create
      .mockRejectedValueOnce(new Error('conflict'))
      .mockResolvedValue({ id: 'test' });

    await ensureAesopAgents(mockRegistry as any, mockLogger);

    expect(mockRegistry.create).toHaveBeenCalledTimes(AESOP_AGENTS.length);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('returns map of agent IDs to creation status', async () => {
    mockRegistry.has.mockResolvedValue(true);

    const result = await ensureAesopAgents(mockRegistry as any, mockLogger);

    expect(result.size).toBe(AESOP_AGENTS.length);
  });

  it('passes correct agent configuration to create', async () => {
    mockRegistry.has.mockResolvedValue(false);
    mockRegistry.create.mockResolvedValue({ id: 'test' });

    await ensureAesopAgents(mockRegistry as any, mockLogger);

    const firstCall = mockRegistry.create.mock.calls[0][0];
    expect(firstCall).toHaveProperty('id');
    expect(firstCall).toHaveProperty('name');
    expect(firstCall).toHaveProperty('description');
    expect(firstCall).toHaveProperty('configuration');
    expect(firstCall.configuration).toHaveProperty('instructions');
    expect(firstCall.configuration).toHaveProperty('tools');
    expect(firstCall.labels).toContain('aesop');
  });
});
