/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentType } from '@kbn/agent-builder-common';
import type { AgentProperties } from './client/storage';
import type { AgentProfileStorage } from './client/storage';
import { runSkillRefCleanup } from './skill_reference_cleanup';
import { createSpaceDslFilter } from '../../../utils/spaces';

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
      tools: [],
      skill_ids: ['skill-a', 'skill-b'],
    },
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    ...overrides,
  };
}

function expectSearchWithSkillFilter(search: jest.Mock, spaceId: string, skillIds: string[]): void {
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [createSpaceDslFilter(spaceId), { terms: { 'config.skill_ids': skillIds } }],
        },
      },
    })
  );
}

function createMockStorage(searchImplementation: jest.Mock): jest.Mocked<AgentProfileStorage> {
  const bulk = jest.fn().mockResolvedValue(undefined);

  return {
    getClient: jest.fn().mockReturnValue({
      search: searchImplementation,
      bulk,
    }),
  } as unknown as jest.Mocked<AgentProfileStorage>;
}

function createMockStorageSingleResponse(searchResponse: {
  hits: Array<{ _id: string; _source?: AgentProperties }>;
}): jest.Mocked<AgentProfileStorage> {
  const search = jest.fn().mockResolvedValue({
    hits: {
      hits: searchResponse.hits,
    },
  });
  return createMockStorage(search);
}

describe('runSkillRefCleanup', () => {
  it('returns no agents when skillIds is empty without calling search', async () => {
    const search = jest.fn();
    const storage = createMockStorage(search);
    const result = await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: [],
    });
    expect(result).toEqual({ agents: [] });
    expect(search).not.toHaveBeenCalled();
    expect(storage.getClient().bulk).not.toHaveBeenCalled();
  });

  it('completes without error when there are no hits', async () => {
    const storage = createMockStorageSingleResponse({ hits: [] });
    const result = await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: ['skill-a'],
    });
    expect(result).toEqual({ agents: [] });
    expect(storage.getClient().bulk).not.toHaveBeenCalled();
    expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, SPACE_ID, ['skill-a']);
  });

  it('skips hits without _source', async () => {
    const storage = createMockStorageSingleResponse({
      hits: [{ _id: '1' }, { _id: '2', _source: createAgentSource({ id: 'agent-2' }) }],
    });
    const result = await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: ['skill-a'],
      checkOnly: true,
    });
    expect(result).toEqual({ agents: [{ id: 'agent-2', name: 'Test Agent' }] });
    expect(storage.getClient().bulk).not.toHaveBeenCalled();
    expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, SPACE_ID, ['skill-a']);
  });

  it('returns no agents when Elasticsearch returns no matching hits', async () => {
    const storage = createMockStorageSingleResponse({ hits: [] });
    const result = await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: ['skill-a', 'skill-b'],
    });
    expect(result).toEqual({ agents: [] });
    expect(storage.getClient().bulk).not.toHaveBeenCalled();
    expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, SPACE_ID, [
      'skill-a',
      'skill-b',
    ]);
  });

  it('prefers config.skill_ids over configuration.skill_ids when building bulk update', async () => {
    const matchingHit = {
      _id: 'doc-1',
      _source: createAgentSource({
        id: 'agent-1',
        config: { instructions: '', tools: [], skill_ids: ['skill-from-config'] },
        configuration: {
          instructions: '',
          tools: [],
          skill_ids: ['skill-from-legacy'],
        },
      }),
    };
    const search = jest
      .fn()
      .mockResolvedValueOnce({ hits: { hits: [matchingHit] } })
      .mockResolvedValueOnce({ hits: { hits: [] } });
    const storage = createMockStorage(search);
    const result = await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: ['skill-from-config'],
      checkOnly: true,
    });
    expect(result.agents).toHaveLength(1);
    const result2 = await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: ['skill-from-legacy'],
      checkOnly: true,
    });
    expect(result2).toEqual({ agents: [] });
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              createSpaceDslFilter(SPACE_ID),
              { terms: { 'config.skill_ids': ['skill-from-config'] } },
            ],
          },
        },
      })
    );
    expect(search.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              createSpaceDslFilter(SPACE_ID),
              { terms: { 'config.skill_ids': ['skill-from-legacy'] } },
            ],
          },
        },
      })
    );
  });

  it('updates agents that reference a deleted skill and removes those ids', async () => {
    const source = createAgentSource({
      id: 'agent-1',
      config: {
        instructions: '',
        tools: [],
        skill_ids: ['skill-a', 'skill-b'],
      },
    });
    const storage = createMockStorageSingleResponse({
      hits: [{ _id: 'doc-1', _source: source }],
    });
    const result = await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: ['skill-a'],
    });
    expect(result).toEqual({ agents: [{ id: 'agent-1', name: 'Test Agent' }] });
    expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, SPACE_ID, ['skill-a']);
    expect(storage.getClient().bulk).toHaveBeenCalledTimes(1);
    const [bulkCall] = (storage.getClient().bulk as jest.Mock).mock.calls;
    const operations = bulkCall[0].operations;
    expect(operations).toHaveLength(1);
    expect(operations[0].index._id).toBe('doc-1');
    const doc = operations[0].index.document as AgentProperties;
    expect(doc.config.skill_ids).toEqual(['skill-b']);
  });

  it('executes exactly one search call', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'doc-1',
            _source: createAgentSource({
              id: 'agent-1',
              config: { instructions: '', tools: [], skill_ids: ['skill-a'] },
            }),
          },
        ],
      },
    });
    const storage = createMockStorage(search);

    await runSkillRefCleanup({
      storage,
      spaceId: SPACE_ID,
      skillIds: ['skill-a'],
      checkOnly: true,
    });

    expect(search).toHaveBeenCalledTimes(1);
    expectSearchWithSkillFilter(search, SPACE_ID, ['skill-a']);
  });

  it('calls search with space and skill terms filters', async () => {
    const storage = createMockStorageSingleResponse({ hits: [] });
    await runSkillRefCleanup({
      storage,
      spaceId: 'space-1',
      skillIds: ['skill-a', 'skill-z'],
    });
    expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, 'space-1', [
      'skill-a',
      'skill-z',
    ]);
  });

  describe('checkOnly: true', () => {
    it('returns list of agents that reference the skill without modifying data', async () => {
      const source1 = createAgentSource({
        id: 'agent-1',
        name: 'Agent One',
        config: { instructions: '', tools: [], skill_ids: ['skill-a'] },
      });
      const source2 = createAgentSource({
        id: 'agent-2',
        name: 'Agent Two',
        config: { instructions: '', tools: [], skill_ids: ['skill-a', 'skill-b'] },
      });
      const storage = createMockStorageSingleResponse({
        hits: [
          { _id: 'doc-1', _source: source1 },
          { _id: 'doc-2', _source: source2 },
        ],
      });
      const result = await runSkillRefCleanup({
        storage,
        spaceId: SPACE_ID,
        skillIds: ['skill-a'],
        checkOnly: true,
      });
      expect(result).toEqual({
        agents: [
          { id: 'agent-1', name: 'Agent One' },
          { id: 'agent-2', name: 'Agent Two' },
        ],
      });
      expect(storage.getClient().bulk).not.toHaveBeenCalled();
      expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, SPACE_ID, ['skill-a']);
    });

    it('returns agent id only when name is missing', async () => {
      const source = createAgentSource({
        id: 'agent-1',
        name: undefined as unknown as string,
        config: { instructions: '', tools: [], skill_ids: ['skill-a'] },
      });
      const storage = createMockStorageSingleResponse({
        hits: [{ _id: 'doc-1', _source: source }],
      });
      const result = await runSkillRefCleanup({
        storage,
        spaceId: SPACE_ID,
        skillIds: ['skill-a'],
        checkOnly: true,
      });
      expect(result).toEqual({ agents: [{ id: 'agent-1' }] });
      expect(storage.getClient().bulk).not.toHaveBeenCalled();
      expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, SPACE_ID, ['skill-a']);
    });
  });

  it('logs error and rethrows when bulk fails', async () => {
    const logger = { warn: jest.fn(), error: jest.fn() };
    const storage = createMockStorageSingleResponse({
      hits: [
        {
          _id: '1',
          _source: createAgentSource({
            config: { instructions: '', tools: [], skill_ids: ['skill-a'] },
          }),
        },
      ],
    });
    (storage.getClient().bulk as jest.Mock).mockRejectedValue(new Error('Bulk failed'));
    await expect(
      runSkillRefCleanup({
        storage,
        spaceId: SPACE_ID,
        skillIds: ['skill-a'],
        logger: logger as unknown as import('@kbn/logging').Logger,
      })
    ).rejects.toThrow('Bulk failed');
    expectSearchWithSkillFilter(storage.getClient().search as jest.Mock, SPACE_ID, ['skill-a']);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Skill ref cleanup: bulk update failed')
    );
  });
});
