/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AgentProfileStorage, AgentProperties } from './client/storage';
import type { SkillStorage, SkillProperties } from '../../skills/persisted/client/storage';
import {
  replaceToolIdsInToolSelection,
  replaceToolIdsInArray,
  migrateAgentToolIds,
  migrateSkillToolIds,
} from './tool_id_migration';

const OLD_ID = 'platform.core.cases.attachments';
const NEW_IDS = ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments'];

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

const makeHit = <T>(source: T, id: string) => ({
  _id: id,
  _index: '.chat-agents',
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

describe('replaceToolIdsInToolSelection', () => {
  it('replaces old id with new ids', () => {
    const tools = [{ tool_ids: ['other.tool', 'platform.core.cases.attachments'] }];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([
      {
        tool_ids: [
          'other.tool',
          'platform.core.cases.get_attachments',
          'platform.core.cases.manage_attachments',
        ],
      },
    ]);
  });

  it('returns unchanged array when old id is not present', () => {
    const tools = [{ tool_ids: ['other.tool'] }];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([{ tool_ids: ['other.tool'] }]);
  });

  it('does not duplicate if new ids already present', () => {
    const tools = [
      {
        tool_ids: ['platform.core.cases.attachments', 'platform.core.cases.get_attachments'],
      },
    ];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([
      {
        tool_ids: ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments'],
      },
    ]);
  });

  it('handles multiple selections', () => {
    const tools = [{ tool_ids: ['platform.core.cases.attachments'] }, { tool_ids: ['other.tool'] }];
    const result = replaceToolIdsInToolSelection(tools, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual([
      {
        tool_ids: ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments'],
      },
      { tool_ids: ['other.tool'] },
    ]);
  });
});

describe('replaceToolIdsInArray', () => {
  it('replaces old id with new ids', () => {
    const result = replaceToolIdsInArray(
      ['other.tool', 'platform.core.cases.attachments'],
      'platform.core.cases.attachments',
      ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments']
    );
    expect(result).toEqual([
      'other.tool',
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
  });

  it('returns unchanged array when old id is not present', () => {
    const result = replaceToolIdsInArray(['other.tool'], 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toEqual(['other.tool']);
  });

  it('does not duplicate if new ids already present', () => {
    const result = replaceToolIdsInArray(
      ['platform.core.cases.attachments', 'platform.core.cases.get_attachments'],
      'platform.core.cases.attachments',
      ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments']
    );
    expect(result).toEqual([
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
  });

  it('returns same reference when old id is absent', () => {
    const original = ['other.tool'];
    const result = replaceToolIdsInArray(original, 'platform.core.cases.attachments', [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ]);
    expect(result).toBe(original);
  });
});

describe('migrateAgentToolIds', () => {
  const logger = loggingSystemMock.createLogger();

  it('bulk-indexes agents that contain the old tool ID', async () => {
    const source = makeAgentSource([OLD_ID]);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await migrateAgentToolIds({ storage, logger });

    expect((client.bulk as jest.Mock).mock.calls).toHaveLength(1);
    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(ops).toHaveLength(1);
    const { document } = ops[0].index;
    const toolIds = (document.config ?? document.configuration).tools[0].tool_ids;
    expect(toolIds).toEqual(expect.arrayContaining(NEW_IDS));
    expect(toolIds).not.toContain(OLD_ID);
  });

  it('skips agents that do not contain the old tool ID', async () => {
    const source = makeAgentSource(['other.tool']);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await migrateAgentToolIds({ storage, logger });

    expect((client.bulk as jest.Mock)).not.toHaveBeenCalled();
  });

  it('reads the old tool ID from the legacy configuration field', async () => {
    const source: AgentProperties = {
      ...makeAgentSource([]),
      configuration: { tools: [{ tool_ids: [OLD_ID] }] },
      config: { tools: [] },
    };
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await migrateAgentToolIds({ storage, logger });

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

    await migrateAgentToolIds({ storage, logger });

    expect((client.search as jest.Mock).mock.calls).toHaveLength(2);
    const totalBulkOps = (client.bulk as jest.Mock).mock.calls.flatMap(
      ([req]) => req.operations
    );
    expect(totalBulkOps).toHaveLength(2);
  });

  it('is idempotent — does not duplicate new IDs already present', async () => {
    const source = makeAgentSource([OLD_ID, 'platform.core.cases.get_attachments']);
    const storage = buildAgentStorageMock([[source], []]);
    const client = storage.getClient();

    await migrateAgentToolIds({ storage, logger });

    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    const toolIds = (ops[0].index.document.config ?? ops[0].index.document.configuration).tools[0]
      .tool_ids;
    expect(toolIds.filter((id: string) => id === 'platform.core.cases.get_attachments')).toHaveLength(1);
  });
});

describe('migrateSkillToolIds', () => {
  const logger = loggingSystemMock.createLogger();

  it('bulk-indexes skills that contain the old tool ID', async () => {
    const source = makeSkillSource([OLD_ID]);
    const storage = buildSkillStorageMock([[source], []]);
    const client = storage.getClient();

    await migrateSkillToolIds({ storage, logger });

    expect((client.bulk as jest.Mock).mock.calls).toHaveLength(1);
    const ops = (client.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(ops).toHaveLength(1);
    const { document } = ops[0].index;
    expect(document.tool_ids).toEqual(expect.arrayContaining(NEW_IDS));
    expect(document.tool_ids).not.toContain(OLD_ID);
  });

  it('skips skills that do not contain the old tool ID', async () => {
    const source = makeSkillSource(['other.tool']);
    const storage = buildSkillStorageMock([[source], []]);
    const client = storage.getClient();

    await migrateSkillToolIds({ storage, logger });

    expect((client.bulk as jest.Mock)).not.toHaveBeenCalled();
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

    await migrateSkillToolIds({ storage, logger });

    expect((client.search as jest.Mock).mock.calls).toHaveLength(2);
    const totalBulkOps = (client.bulk as jest.Mock).mock.calls.flatMap(
      ([req]) => req.operations
    );
    expect(totalBulkOps).toHaveLength(2);
  });
});
