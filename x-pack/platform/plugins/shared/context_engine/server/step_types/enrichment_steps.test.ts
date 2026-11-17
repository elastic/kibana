/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexService } from '../ai_indices/service';
import { readActiveKis } from '../dreaming/active_kis';
import { applyEnrichment, selectEnrichmentCandidates } from '../dreaming/enrichment';
import type { ResearchStepDependencies } from './helpers';
import {
  getApplyEnrichmentStepDefinition,
  getReadKisStepDefinition,
  getSelectEnrichmentCandidatesStepDefinition,
} from './enrichment_steps';
import { createMockStepContext, mockKiWriter } from './test_utils';

jest.mock('../dreaming/active_kis', () => ({ readActiveKis: jest.fn() }));
jest.mock('../dreaming/enrichment', () => ({
  applyEnrichment: jest.fn(),
  selectEnrichmentCandidates: jest.fn(),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
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

describe('getReadKisStepDefinition', () => {
  it('reads one or more KIs as a model reads them, without dreaming internals', async () => {
    jest.mocked(readActiveKis).mockResolvedValue([
      {
        id: 'entity-acme',
        type: 'entity.customer',
        title: 'Acme',
        content: `${'Acme is a customer. '.repeat(10)}\n\n## Access patterns\n- [x] y`,
        updated_at: '2026-11-10T00:00:00.000Z',
        attributes: { tier: 'gold', access_patterns: ['{}'], esql: ['FROM x'] },
        permissions: { kibana: { privileges: [{ space: 'default' }] } },
      },
    ]);

    const { output } = await getReadKisStepDefinition(depsFor()).handler(
      createMockStepContext({
        input: { ai_index_id: 'support', ids: 'entity-acme', max_content_length: 20 },
        esClient: {},
      })
    );

    expect(readActiveKis).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['entity-acme'], dest, spaceId: 'default' })
    );
    expect(output?.kis).toEqual([
      {
        id: 'entity-acme',
        type: 'entity.customer',
        title: 'Acme',
        content: 'Acme is a customer.…',
        updated_at: '2026-11-10T00:00:00.000Z',
        attributes: { tier: 'gold' },
      },
    ]);
  });
});

describe('getSelectEnrichmentCandidatesStepDefinition', () => {
  it('selects with the KI types and refresh of the enrichment config', async () => {
    const result = { candidates: [], scanned: 0 };
    jest.mocked(selectEnrichmentCandidates).mockResolvedValue(result);

    const { output } = await getSelectEnrichmentCandidatesStepDefinition(
      depsFor({
        enabled: true,
        enrichment: { enabled: true, ki_types: ['entity.customer'], refresh_after: '7d' },
      })
    ).handler(
      createMockStepContext({ input: { ai_index_id: 'support', limit: 20 }, esClient: {} })
    );

    expect(output).toBe(result);
    expect(selectEnrichmentCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        dest,
        kiTypes: ['entity.customer'],
        refreshAfterMs: 7 * DAY_MS,
        limit: 20,
      })
    );
  });

  it('defaults to every fact and entity, revisited after 30 days, 100 at most', async () => {
    jest.mocked(selectEnrichmentCandidates).mockResolvedValue({ candidates: [], scanned: 0 });

    await getSelectEnrichmentCandidatesStepDefinition(depsFor({ enabled: true })).handler(
      createMockStepContext({ input: { ai_index_id: 'support' }, esClient: {} })
    );

    expect(selectEnrichmentCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        kiTypes: ['fact.*', 'entity.*'],
        refreshAfterMs: 30 * DAY_MS,
        limit: 100,
      })
    );
  });
});

describe('getApplyEnrichmentStepDefinition', () => {
  const input = {
    ai_index_id: 'support',
    ki_id: 'entity-acme',
    expected_updated_at: '2026-11-10T00:00:00.000Z',
    changes: { changed: true, content: 'Acme is gold.', citations: ['e-1'] },
    evidence: [{ id: 'e-1', source: 'esql:1', uri: 'index://crm/1', text: 'gold' }],
  };
  const run = (overrides: Record<string, unknown> = {}, canWrite = true) =>
    getApplyEnrichmentStepDefinition(depsFor({ enabled: true }, canWrite)).handler(
      createMockStepContext({ input: { ...input, ...overrides }, esClient: {} })
    );
  const document = { id: 'entity-acme', type: 'entity.customer', title: 'Acme' };

  it('applies the change as the workflow, and counts an improvement', async () => {
    jest.mocked(applyEnrichment).mockResolvedValue({
      status: 'updated',
      document,
      improved: true,
      cited: ['e-1'],
      dropped_citations: [],
    });

    const { output } = await run();

    expect(applyEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({
        kiId: 'entity-acme',
        expectedUpdatedAt: input.expected_updated_at,
        change: input.changes,
        evidence: input.evidence,
        writer: mockKiWriter,
        dryRun: false,
      })
    );
    expect(output).toEqual({
      status: 'updated',
      improved: true,
      cited: ['e-1'],
      dropped_citations: [],
      tally: { improved: 1, unchanged: 0, skipped: 0 },
      would_write: [],
      document,
    });
  });

  it('counts a KI only marked as enriched as unchanged, and one left alone as skipped', async () => {
    jest.mocked(applyEnrichment).mockResolvedValueOnce({
      status: 'updated',
      document,
      improved: false,
      cited: [],
      dropped_citations: [],
    });
    expect((await run()).output?.tally).toEqual({ improved: 0, unchanged: 1, skipped: 0 });

    jest.mocked(applyEnrichment).mockResolvedValueOnce({
      status: 'skipped',
      reason: 'it no longer exists',
      improved: false,
      cited: [],
      dropped_citations: [],
    });
    const { output } = await run();
    expect(output).toEqual(
      expect.objectContaining({
        reason: 'it no longer exists',
        tally: { improved: 0, unchanged: 0, skipped: 1 },
      })
    );
  });

  it('reports what a dry run would write', async () => {
    jest.mocked(applyEnrichment).mockResolvedValue({
      status: 'updated',
      document,
      improved: true,
      cited: ['e-1'],
      dropped_citations: [],
    });

    const { output } = await run({ dry_run: true });

    expect(applyEnrichment).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(output?.would_write).toEqual([
      { id: 'entity-acme', change: 'updated', type: 'entity.customer', title: 'Acme' },
    ]);
  });

  it('does not pass an empty expected update time', async () => {
    jest.mocked(applyEnrichment).mockResolvedValue({
      status: 'updated',
      document,
      improved: false,
      cited: [],
      dropped_citations: [],
    });

    await run({ expected_updated_at: '' });

    expect(jest.mocked(applyEnrichment).mock.calls[0][0]).not.toHaveProperty('expectedUpdatedAt');
  });

  it('fails without the write privilege', async () => {
    await expect(run({}, false)).rejects.toThrow('Insufficient privileges');
    expect(applyEnrichment).not.toHaveBeenCalled();
  });
});
