/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  AgentProfileStorage,
  AgentProperties,
} from '../services/agents/persisted/client/storage';
import type { SkillStorage, SkillProperties } from '../services/skills/persisted/client/storage';
import {
  addToolIdsToToolSelection,
  addToolIdsToArray,
  backfillAgentToolIds,
  backfillSkillToolIds,
} from './tool_id_backfill';

const OLD_ID = 'platform.core.cases.attachments';
const SUPPLEMENTAL_IDS = [
  'platform.core.cases.get_attachments',
  'platform.core.cases.manage_attachments',
];

const makeAgentSource = (toolIds: string[]): AgentProperties => ({
  id: 'agent-1',
  name: 'Test Agent',
  type: 'default',
  space: 'default',
  description: 'test',
  config: { tools: [{ tool_ids: toolIds }] },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
});

const makeSkillSource = (toolIds: string[]): SkillProperties => ({
  id: 'skill-1',
  name: 'Test Skill',
  space: 'default',
  description: 'test',
  content: 'test content',
  tool_ids: toolIds,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
});

const makeHit = <T>(source: T, id: string, seqNo = 1, primaryTerm = 1) => ({
  _id: id,
  _index: '.chat-agents',
  _seq_no: seqNo,
  _primary_term: primaryTerm,
  _source: source,
  sort: [id],
});

const buildAgentStorageMock = (pages: AgentProperties[][]): AgentProfileStorage => {
  let pageIndex = 0;
  const search = jest.fn().mockImplementation(() => {
    const hits = (pages[pageIndex] ?? []).map((s) => makeHit(s, s.id));
    pageIndex++;
    return Promise.resolve({ hits: { hits } });
  });
  const bulk = jest.fn().mockResolvedValue({ items: [], errors: false });
  return { getClient: () => ({ search, bulk }) } as unknown as AgentProfileStorage;
};

const buildSkillStorageMock = (pages: SkillProperties[][]): SkillStorage => {
  let pageIndex = 0;
  const search = jest.fn().mockImplementation(() => {
    const hits = (pages[pageIndex] ?? []).map((s) => makeHit(s, s.id));
    pageIndex++;
    return Promise.resolve({ hits: { hits } });
  });
  const bulk = jest.fn().mockResolvedValue({ items: [], errors: false });
  return { getClient: () => ({ search, bulk }) } as unknown as SkillStorage;
};

describe('addToolIdsToToolSelection', () => {
  it('adds new IDs alongside the old ID without removing it', () => {
    const tools = [{ tool_ids: ['platform.core.cases.attachments', 'platform.core.search'] }];
    const result = addToolIdsToToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result[0].tool_ids).toEqual([
      'platform.core.cases.attachments',
      'platform.core.search',
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
  });

  it('does not duplicate IDs that already exist', () => {
    const tools = [
      {
        tool_ids: ['platform.core.cases.attachments', 'platform.core.cases.get_attachments'],
      },
    ];
    const result = addToolIdsToToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result[0].tool_ids).toEqual([
      'platform.core.cases.attachments',
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
  });

  it('is a no-op when old ID is not present', () => {
    const tools = [{ tool_ids: ['platform.core.search'] }];
    const result = addToolIdsToToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
    ]);
    expect(result).toBe(tools); // same reference
  });

  it('is a no-op when all supplemental IDs already exist', () => {
    const tools = [
      {
        tool_ids: [
          'platform.core.cases.attachments',
          'platform.core.cases.get_attachments',
          'platform.core.cases.manage_attachments',
        ],
      },
    ];
    const result = addToolIdsToToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toBe(tools); // same reference — nothing to add
  });

  it('handles multiple selections', () => {
    const tools = [{ tool_ids: ['platform.core.cases.attachments'] }, { tool_ids: ['other.tool'] }];
    const result = addToolIdsToToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([
      {
        tool_ids: [
          'platform.core.cases.attachments',
          'platform.core.cases.get_attachments',
          'platform.core.cases.manage_attachments',
        ],
      },
      { tool_ids: ['other.tool'] },
    ]);
  });
});

describe('addToolIdsToArray', () => {
  it('adds new IDs alongside old without removing it', () => {
    const result = addToolIdsToArray(
      ['platform.core.cases.attachments', 'other'],
      'platform.core.cases.attachments',
      ['platform.core.cases.get_attachments']
    );
    expect(result).toEqual([
      'platform.core.cases.attachments',
      'other',
      'platform.core.cases.get_attachments',
    ]);
  });

  it('returns unchanged array when old id is not present', () => {
    const original = ['other.tool'];
    const result = addToolIdsToArray(original, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toBe(original); // same reference
  });

  it('does not duplicate if supplemental ids already present', () => {
    const result = addToolIdsToArray(
      [
        'platform.core.cases.attachments',
        'platform.core.cases.get_attachments',
        'platform.core.cases.manage_attachments',
      ],
      'platform.core.cases.attachments',
      ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments']
    );
    expect(result).toEqual([
      'platform.core.cases.attachments',
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
  });

  it('returns same reference when all supplemental IDs already present', () => {
    const original = [
      'platform.core.cases.attachments',
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ];
    const result = addToolIdsToArray(original, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toBe(original); // same reference — nothing to add
  });
});

describe('backfillAgentToolIds', () => {
  const logger = loggingSystemMock.createLogger();

  it('bulk-indexes agents that contain the old tool ID, keeping the old ID', async () => {
    const source = makeAgentSource([OLD_ID]);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    expect((client.bulk as jest.Mock).mock.calls).toHaveLength(1);
    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(ops).toHaveLength(1);
    const { document } = ops[0].index;
    const toolIds = (document.config ?? document.configuration).tools[0].tool_ids;
    expect(toolIds).toEqual(expect.arrayContaining(SUPPLEMENTAL_IDS));
    expect(toolIds).toContain(OLD_ID); // old ID is kept
  });

  it('skips agents that do not contain the old tool ID', async () => {
    const source = makeAgentSource(['other.tool']);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    expect(client.bulk as jest.Mock).not.toHaveBeenCalled();
  });

  it('reads the old tool ID from the legacy configuration field', async () => {
    const source: AgentProperties = {
      ...makeAgentSource([]),
      configuration: { tools: [{ tool_ids: [OLD_ID] }] },
      config: { tools: [] },
    };
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    expect((client.bulk as jest.Mock).mock.calls).toHaveLength(1);
    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(ops).toHaveLength(1);
  });

  it('paginates across multiple pages', async () => {
    // Fill a full page (1000 items) so the loop does not short-circuit on size < PAGE_SIZE.
    const fullPage: AgentProperties[] = Array.from({ length: 1000 }, (_, i) => ({
      ...makeAgentSource(i === 0 ? [OLD_ID] : ['other.tool']),
      id: `agent-${i}`,
    }));
    // page2 has fewer than PAGE_SIZE items → loop stops after this page.
    const page2 = [{ ...makeAgentSource([OLD_ID]), id: 'agent-1000' }];
    const storage = buildAgentStorageMock([fullPage, page2]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    expect((client.search as jest.Mock).mock.calls).toHaveLength(2);
    const totalBulkOps = (client.bulk as jest.Mock).mock.calls.flatMap(([req]) => req.operations);
    expect(totalBulkOps).toHaveLength(2);
  });

  it('is idempotent — does not duplicate supplemental IDs already present', async () => {
    const source = makeAgentSource([OLD_ID, 'platform.core.cases.get_attachments']);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    const toolIds = (ops[0].index.document.config ?? ops[0].index.document.configuration).tools[0]
      .tool_ids;
    expect(
      toolIds.filter((id: string) => id === 'platform.core.cases.get_attachments')
    ).toHaveLength(1);
  });

  it('skips agents where all supplemental IDs are already present', async () => {
    const source = makeAgentSource([OLD_ID, ...SUPPLEMENTAL_IDS]);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    expect(client.bulk as jest.Mock).not.toHaveBeenCalled();
  });

  it('sorts on (id, space) for unambiguous search_after across spaces', async () => {
    const source = makeAgentSource(['other.tool']);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    const searchReq = (client.search as jest.Mock).mock.calls[0][0];
    expect(searchReq.sort).toEqual([{ id: 'asc' }, { space: 'asc' }]);
  });

  it('passes if_seq_no and if_primary_term into bulk index ops', async () => {
    const source = makeAgentSource([OLD_ID]);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillAgentToolIds({ storage, logger });

    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(ops[0].index.if_seq_no).toBe(1);
    expect(ops[0].index.if_primary_term).toBe(1);
  });
});

describe('backfillSkillToolIds', () => {
  const logger = loggingSystemMock.createLogger();

  it('bulk-indexes skills that contain the old tool ID, keeping the old ID', async () => {
    const source = makeSkillSource([OLD_ID]);
    const storage = buildSkillStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillSkillToolIds({ storage, logger });

    expect((client.bulk as jest.Mock).mock.calls).toHaveLength(1);
    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(ops).toHaveLength(1);
    const { document } = ops[0].index;
    expect(document.tool_ids).toEqual(expect.arrayContaining(SUPPLEMENTAL_IDS));
    expect(document.tool_ids).toContain(OLD_ID); // old ID is kept
  });

  it('skips skills that do not contain the old tool ID', async () => {
    const source = makeSkillSource(['other.tool']);
    const storage = buildSkillStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillSkillToolIds({ storage, logger });

    expect(client.bulk as jest.Mock).not.toHaveBeenCalled();
  });

  it('paginates across multiple pages', async () => {
    // Fill a full page (1000 items) so the loop does not short-circuit on size < PAGE_SIZE.
    const fullPage: SkillProperties[] = Array.from({ length: 1000 }, (_, i) => ({
      ...makeSkillSource(i === 0 ? [OLD_ID] : ['other.tool']),
      id: `skill-${i}`,
    }));
    // page2 has fewer than PAGE_SIZE items → loop stops after this page.
    const page2 = [{ ...makeSkillSource([OLD_ID]), id: 'skill-1000' }];
    const storage = buildSkillStorageMock([fullPage, page2]);
    const client = storage.getClient();

    await backfillSkillToolIds({ storage, logger });

    expect((client.search as jest.Mock).mock.calls).toHaveLength(2);
    const totalBulkOps = (client.bulk as jest.Mock).mock.calls.flatMap(([req]) => req.operations);
    expect(totalBulkOps).toHaveLength(2);
  });

  it('skips skills where all supplemental IDs are already present', async () => {
    const source = makeSkillSource([OLD_ID, ...SUPPLEMENTAL_IDS]);
    const storage = buildSkillStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillSkillToolIds({ storage, logger });

    expect(client.bulk as jest.Mock).not.toHaveBeenCalled();
  });

  it('sorts on (id, space) for unambiguous search_after across spaces', async () => {
    const source = makeSkillSource(['other.tool']);
    const storage = buildSkillStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillSkillToolIds({ storage, logger });

    const searchReq = (client.search as jest.Mock).mock.calls[0][0];
    expect(searchReq.sort).toEqual([{ id: 'asc' }, { space: 'asc' }]);
  });

  it('passes if_seq_no and if_primary_term into bulk index ops', async () => {
    const source = makeSkillSource([OLD_ID]);
    const storage = buildSkillStorageMock([[source], []]);
    const client = storage.getClient();

    await backfillSkillToolIds({ storage, logger });

    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(ops[0].index.if_seq_no).toBe(1);
    expect(ops[0].index.if_primary_term).toBe(1);
  });
});
