/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentType } from '@kbn/agent-builder-common';
import type { AgentProperties } from './client/storage';
import type { AgentProfileStorage } from './client/storage';
import { runToolRefCleanup } from './tool_reference_cleanup';

const SPACE_ID = 'default';
const CREATED_AT = '2025-01-01T00:00:00.000Z';
const UPDATED_AT = '2025-01-02T00:00:00.000Z';

function createAgentSource(overrides: Partial<AgentProperties> = {}): AgentProperties {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    type: AgentType.chat,
    space: SPACE_ID,
    description: '',
    config: {
      instructions: '',
      tools: [{ tool_ids: ['tool-a', 'tool-b'] }],
    },
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

function createMockStorage(searchResponse: {
  hits: Array<{ _id: string; _source?: AgentProperties }>;
}): jest.Mocked<AgentProfileStorage> {
  const bulk = jest.fn().mockResolvedValue(undefined);
  const search = jest.fn().mockResolvedValue({
    hits: {
      hits: searchResponse.hits,
    },
  });

  return {
    getClient: jest.fn().mockReturnValue({
      search,
      bulk,
    }),
  } as unknown as jest.Mocked<AgentProfileStorage>;
}

describe('runToolRefCleanup', () => {
  it('completes without error when there are no hits', async () => {
    const storage = createMockStorage({ hits: [] });
    const result = await runToolRefCleanup({
      storage,
      spaceId: SPACE_ID,
      toolIds: ['tool-a'],
    });
    expect(result).toEqual({ agents: [] });
    expect(storage.getClient().bulk).not.toHaveBeenCalled();
  });

  it('skips hits without _source', async () => {
    const storage = createMockStorage({
      hits: [{ _id: '1' }, { _id: '2', _source: createAgentSource({ id: 'agent-2' }) }],
    });
    const result = await runToolRefCleanup({
      storage,
      spaceId: SPACE_ID,
      toolIds: ['tool-x'],
    });
    expect(result).toEqual({ agents: [] });
    expect(storage.getClient().bulk).not.toHaveBeenCalled();
  });

  it('skips agents that do not reference any of the deleted tool ids', async () => {
    const storage = createMockStorage({
      hits: [
        {
          _id: '1',
          _source: createAgentSource({
            config: { instructions: '', tools: [{ tool_ids: ['tool-c', 'tool-d'] }] },
          }),
        },
      ],
    });
    const result = await runToolRefCleanup({
      storage,
      spaceId: SPACE_ID,
      toolIds: ['tool-a', 'tool-b'],
    });
    expect(result).toEqual({ agents: [] });
    expect(storage.getClient().bulk).not.toHaveBeenCalled();
  });

  it('updates agents that reference a deleted tool and removes that tool id from selection', async () => {
    const source = createAgentSource({
      id: 'agent-1',
      config: {
        instructions: '',
        tools: [{ tool_ids: ['tool-a', 'tool-b'] }, { tool_ids: ['tool-c'] }],
      },
    });
    const storage = createMockStorage({
      hits: [{ _id: 'doc-1', _source: source }],
    });
    const result = await runToolRefCleanup({
      storage,
      spaceId: SPACE_ID,
      toolIds: ['tool-a'],
    });
    expect(result).toEqual({ agents: [{ id: 'agent-1', name: 'Test Agent' }] });
    expect(storage.getClient().bulk).toHaveBeenCalledTimes(1);
    const [bulkCall] = (storage.getClient().bulk as jest.Mock).mock.calls;
    const operations = bulkCall[0].operations;
    expect(operations).toHaveLength(1);
    expect(operations[0].index._id).toBe('doc-1');
    const doc = operations[0].index.document as AgentProperties;
    expect(doc.config.tools).toEqual([{ tool_ids: ['tool-b'] }, { tool_ids: ['tool-c'] }]);
  });

  it('updates multiple agents that reference the deleted tool', async () => {
    const source1 = createAgentSource({
      id: 'agent-1',
      config: { instructions: '', tools: [{ tool_ids: ['tool-a'] }] },
    });
    const source2 = createAgentSource({
      id: 'agent-2',
      config: { instructions: '', tools: [{ tool_ids: ['tool-a', 'tool-b'] }] },
    });
    const storage = createMockStorage({
      hits: [
        { _id: 'doc-1', _source: source1 },
        { _id: 'doc-2', _source: source2 },
      ],
    });
    const result = await runToolRefCleanup({
      storage,
      spaceId: SPACE_ID,
      toolIds: ['tool-a'],
    });
    expect(result).toEqual({
      agents: [
        { id: 'agent-1', name: 'Test Agent' },
        { id: 'agent-2', name: 'Test Agent' },
      ],
    });
    expect(storage.getClient().bulk).toHaveBeenCalledTimes(1);
    const [bulkCall] = (storage.getClient().bulk as jest.Mock).mock.calls;
    const operations = bulkCall[0].operations;
    expect(operations).toHaveLength(2);
    expect((operations[0].index.document as AgentProperties).config.tools).toEqual([]);
    expect((operations[1].index.document as AgentProperties).config.tools).toEqual([
      { tool_ids: ['tool-b'] },
    ]);
  });

  it('calls search with space filter and correct size', async () => {
    const storage = createMockStorage({ hits: [] });
    await runToolRefCleanup({
      storage,
      spaceId: 'space-1',
      toolIds: ['tool-a'],
    });
    expect(storage.getClient().search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 1000,
        query: {
          bool: {
            filter: expect.any(Array),
          },
        },
      })
    );
  });

  it('logs warn when search returns at least SEARCH_SIZE hits', async () => {
    const logger = { warn: jest.fn(), error: jest.fn() };
    const manySources = Array.from({ length: 1000 }, (_, i) =>
      createAgentSource({ id: `agent-${i}` })
    );
    const storage = createMockStorage({
      hits: manySources.map((s, i) => ({ _id: `doc-${i}`, _source: s })),
    });
    await runToolRefCleanup({
      storage,
      spaceId: SPACE_ID,
      toolIds: ['tool-x'],
      logger: logger as unknown as import('@kbn/logging').Logger,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Tool ref cleanup: search limit reached')
    );
  });

  describe('checkOnly: true', () => {
    it('returns list of agents that reference the tool without modifying data', async () => {
      const source1 = createAgentSource({
        id: 'agent-1',
        name: 'Agent One',
        config: { instructions: '', tools: [{ tool_ids: ['tool-a'] }] },
      });
      const source2 = createAgentSource({
        id: 'agent-2',
        name: 'Agent Two',
        config: { instructions: '', tools: [{ tool_ids: ['tool-a', 'tool-b'] }] },
      });
      const storage = createMockStorage({
        hits: [
          { _id: 'doc-1', _source: source1 },
          { _id: 'doc-2', _source: source2 },
        ],
      });
      const result = await runToolRefCleanup({
        storage,
        spaceId: SPACE_ID,
        toolIds: ['tool-a'],
        checkOnly: true,
      });
      expect(result).toEqual({
        agents: [
          { id: 'agent-1', name: 'Agent One' },
          { id: 'agent-2', name: 'Agent Two' },
        ],
      });
      expect(storage.getClient().bulk).not.toHaveBeenCalled();
    });

    it('returns empty agents list when no agents reference the tool', async () => {
      const storage = createMockStorage({
        hits: [
          {
            _id: '1',
            _source: createAgentSource({
              config: { instructions: '', tools: [{ tool_ids: ['tool-c'] }] },
            }),
          },
        ],
      });
      const result = await runToolRefCleanup({
        storage,
        spaceId: SPACE_ID,
        toolIds: ['tool-a'],
        checkOnly: true,
      });
      expect(result).toEqual({ agents: [] });
      expect(storage.getClient().bulk).not.toHaveBeenCalled();
    });

    it('returns agent id only when name is missing', async () => {
      const source = createAgentSource({
        id: 'agent-1',
        name: undefined,
        config: { instructions: '', tools: [{ tool_ids: ['tool-a'] }] },
      });
      const storage = createMockStorage({
        hits: [{ _id: 'doc-1', _source: source }],
      });
      const result = await runToolRefCleanup({
        storage,
        spaceId: SPACE_ID,
        toolIds: ['tool-a'],
        checkOnly: true,
      });
      expect(result).toEqual({ agents: [{ id: 'agent-1' }] });
      expect(storage.getClient().bulk).not.toHaveBeenCalled();
    });
  });

  it('logs error and rethrows when bulk fails', async () => {
    const logger = { warn: jest.fn(), error: jest.fn() };
    const storage = createMockStorage({
      hits: [
        {
          _id: '1',
          _source: createAgentSource({
            config: { instructions: '', tools: [{ tool_ids: ['tool-a'] }] },
          }),
        },
      ],
    });
    (storage.getClient().bulk as jest.Mock).mockRejectedValue(new Error('Bulk failed'));
    await expect(
      runToolRefCleanup({
        storage,
        spaceId: SPACE_ID,
        toolIds: ['tool-a'],
        logger: logger as unknown as import('@kbn/logging').Logger,
      })
    ).rejects.toThrow('Bulk failed');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Tool ref cleanup: bulk update failed')
    );
  });
});
