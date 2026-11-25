/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SESSION_MEMORIES_READ_SIZE } from '../../common/step_types/read_session_memories';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import type { SessionEventsService } from '../session_events/types';
import type { SessionMemoryService } from '../session_memory/types';
import { getReadSessionMemoriesStepDefinition } from './read_session_memories';
import { createMockStepContext } from './test_utils';

const input = { ai_index_id: 'support', since: '2026-11-11T12:00:00.000Z' };
const memory = {
  id: 'memory-1',
  sessionId: 'session-1',
  userId: 'jdoe',
  aiIndexIds: ['support'],
  content: 'Priya prefers aisle seats.\nShe said so twice.',
  attributes: { source: 'chat' },
  revisedAt: '2026-11-11T12:30:00.000Z',
};

describe('readSessionMemories step', () => {
  let get: jest.Mock;
  let readRevised: jest.Mock;
  let canRead: boolean;
  let memoryEnabled: boolean;

  const run = (stepInput: Record<string, unknown> = input) =>
    getReadSessionMemoriesStepDefinition({
      getAiIndexService: () => ({ get } as unknown as AiIndexService),
      isContextEngineEnabled: async () => true,
      isMemoryEnabled: async () => memoryEnabled,
      checkReadPrivilege: async () => canRead,
      getSessionMemoryService: async () => ({ readRevised } as unknown as SessionMemoryService),
      getSessionEventsService: async () => ({} as SessionEventsService),
    }).handler(createMockStepContext({ input: stepInput, esClient: {}, spaceId: 'team-a' }));

  beforeEach(() => {
    canRead = true;
    memoryEnabled = true;
    get = jest.fn().mockResolvedValue({ id: 'support' });
    readRevised = jest.fn().mockResolvedValue({ memories: [memory] });
  });

  it('reads the memories of the AI index in the space, shaped as dreaming memories visible in it', async () => {
    await expect(run({ ...input, after: 'memory-0', size: 20 })).resolves.toEqual({
      output: {
        memories: [
          {
            id: 'session-memory:memory-1',
            type: 'memory.session',
            title: 'Priya prefers aisle seats.',
            content: memory.content,
            updated_at: memory.revisedAt,
            user_id: 'jdoe',
            attributes: { source: 'chat', 'session.id': 'session-1' },
            permissions: { kibana: { privileges: [{ space: 'team-a' }] } },
          },
        ],
        resume_from: '',
        resume_after_id: '',
      },
    });
    expect(readRevised).toHaveBeenCalledWith({
      space: 'team-a',
      aiIndexId: 'support',
      since: input.since,
      after: 'memory-0',
      size: 20,
    });
  });

  it('reads from since without an after, and a default size', async () => {
    await run();

    expect(readRevised).toHaveBeenCalledWith({
      space: 'team-a',
      aiIndexId: 'support',
      since: input.since,
      size: DEFAULT_SESSION_MEMORIES_READ_SIZE,
    });
  });

  it('cuts a long first line short in the title', async () => {
    readRevised.mockResolvedValue({
      memories: [{ ...memory, content: 'x'.repeat(300) }],
    });

    const result = await run();

    expect(result.output?.memories[0].title).toBe(`${'x'.repeat(120)} […]`);
  });

  it('hands back where the read stopped when it was cut', async () => {
    readRevised.mockResolvedValue({
      memories: [],
      next: { revisedAt: '2026-11-11T12:45:00.000Z', id: 'memory-9' },
    });

    await expect(run()).resolves.toEqual({
      output: {
        memories: [],
        resume_from: '2026-11-11T12:45:00.000Z',
        resume_after_id: 'memory-9',
      },
    });
  });

  it('reads nothing while memory is off', async () => {
    memoryEnabled = false;

    await expect(run()).resolves.toEqual({
      output: { memories: [], resume_from: '', resume_after_id: '' },
    });
    expect(readRevised).not.toHaveBeenCalled();
  });

  it('fails without the Context Engine read privilege, or for an AI index that is gone', async () => {
    canRead = false;
    await expect(run()).rejects.toThrow('Insufficient privileges to read AI indices');
    expect(readRevised).not.toHaveBeenCalled();

    canRead = true;
    get.mockRejectedValue(new AiIndexNotFoundError('support'));
    await expect(run()).rejects.toThrow("AI index 'support' not found");
    expect(readRevised).not.toHaveBeenCalled();
  });
});
