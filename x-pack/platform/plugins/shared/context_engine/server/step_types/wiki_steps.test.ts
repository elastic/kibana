/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexService } from '../ai_indices/service';
import { applyWikiPage, gatherWikiPage } from '../dreaming/wiki';
import type { ResearchStepDependencies } from './helpers';
import { createMockStepContext, mockKiWriter } from './test_utils';
import { getApplyWikiPageStepDefinition, getGatherWikiPageStepDefinition } from './wiki_steps';

jest.mock('../dreaming/wiki', () => ({ applyWikiPage: jest.fn(), gatherWikiPage: jest.fn() }));

const dest = { type: 'index', value: 'ai-index-idx-support' };

const depsFor = (
  dreaming?: Record<string, unknown>,
  canWrite = true
): ResearchStepDependencies => ({
  getAiIndexService: () =>
    ({
      get: jest.fn().mockResolvedValue({ id: 'support', dest, sources: [], dreaming }),
    } as unknown as AiIndexService),
  isDreamingAvailable: async () => true,
  checkReadPrivilege: async () => true,
  checkWritePrivilege: async () => canWrite,
  getActions: async () => ({} as ActionsPluginStart),
  logger: loggingSystemMock.createLogger(),
});

beforeEach(() => jest.clearAllMocks());

describe('getGatherWikiPageStepDefinition', () => {
  it('gathers the page with the KI types of the wiki config', async () => {
    const gathered = { members: [], dropped: 0 };
    jest.mocked(gatherWikiPage).mockResolvedValue(gathered);

    const { output } = await getGatherWikiPageStepDefinition(
      depsFor({ enabled: true, wiki: { enabled: true, ki_types: ['entity.customer'] } })
    ).handler(
      createMockStepContext({
        input: {
          ai_index_id: 'support',
          page_ref: 'wiki-acme',
          seed_ids: ['fact-1'],
          member_query: 'acme',
          max_members: 10,
        },
        esClient: {},
      })
    );

    expect(output).toBe(gathered);
    expect(gatherWikiPage).toHaveBeenCalledWith(
      expect.objectContaining({
        dest,
        pageRef: 'wiki-acme',
        seedIds: ['fact-1'],
        memberQuery: 'acme',
        kiTypes: ['entity.customer'],
        maxMembers: 10,
      })
    );
  });

  it('defaults to every fact and entity', async () => {
    jest.mocked(gatherWikiPage).mockResolvedValue({ members: [], dropped: 0 });

    await getGatherWikiPageStepDefinition(depsFor({ enabled: true })).handler(
      createMockStepContext({ input: { ai_index_id: 'support', seed_ids: [] }, esClient: {} })
    );

    expect(gatherWikiPage).toHaveBeenCalledWith(
      expect.objectContaining({ kiTypes: ['fact.*', 'entity.*'] })
    );
  });
});

describe('getApplyWikiPageStepDefinition', () => {
  const page = { title: 'Acme', content: '# Acme', member_ids: ['fact-1'], citations: [] };
  const run = (overrides: Record<string, unknown> = {}, canWrite = true) =>
    getApplyWikiPageStepDefinition(depsFor({ enabled: true }, canWrite)).handler(
      createMockStepContext({
        input: { ai_index_id: 'support', page_ref: 'new:1', page, evidence: [], ...overrides },
        esClient: {},
      })
    );
  const document = { id: 'wiki-acme', type: 'wiki.page', title: 'Acme' };

  it('applies the page as the workflow, and counts it', async () => {
    jest.mocked(applyWikiPage).mockResolvedValue({
      status: 'created',
      id: 'wiki-acme',
      members: 1,
      cited: [],
      dropped_citations: [],
      document,
    });

    const { output } = await run();

    expect(applyWikiPage).toHaveBeenCalledWith(
      expect.objectContaining({
        pageRef: 'new:1',
        change: page,
        writer: mockKiWriter,
        dryRun: false,
      })
    );
    expect(output).toEqual({
      status: 'created',
      id: 'wiki-acme',
      members: 1,
      cited: [],
      dropped_citations: [],
      tally: { created: 1, updated: 0, skipped: 0 },
      would_write: [],
      document,
    });
  });

  it('counts a skipped page and says why', async () => {
    jest.mocked(applyWikiPage).mockResolvedValue({
      status: 'skipped',
      reason: 'nothing changed',
      members: 0,
      cited: [],
      dropped_citations: [],
    });

    const { output } = await run();

    expect(output).toEqual(
      expect.objectContaining({
        reason: 'nothing changed',
        tally: { created: 0, updated: 0, skipped: 1 },
        would_write: [],
      })
    );
  });

  it('reports what a dry run would write', async () => {
    jest.mocked(applyWikiPage).mockResolvedValue({
      status: 'updated',
      id: 'wiki-acme',
      members: 1,
      cited: [],
      dropped_citations: [],
      document,
    });

    const { output } = await run({ dry_run: true });

    expect(output?.would_write).toEqual([
      { id: 'wiki-acme', change: 'updated', type: 'wiki.page', title: 'Acme' },
    ]);
  });

  it('fails without the write privilege', async () => {
    await expect(run({}, false)).rejects.toThrow('Insufficient privileges');
    expect(applyWikiPage).not.toHaveBeenCalled();
  });
});
