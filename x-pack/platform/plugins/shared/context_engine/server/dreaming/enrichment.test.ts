/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { KiConflictError } from '../ai_indices/errors';
import { findKiRevision, putKiRevision, type KiRevision } from '../ai_indices/ki_revision';
import type { Evidence } from '../../common/step_types/research';
import type { DreamedKi } from './dreamed_ki';
import {
  MAX_EVIDENCE_REFERENCES,
  applyEnrichment,
  enrichmentReason,
  selectEnrichmentCandidates,
  withEvidenceReferences,
} from './enrichment';

jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  findKiRevision: jest.fn(),
  putKiRevision: jest.fn(),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-16T12:00:00.000Z');
const dest = { type: 'index' as const, value: 'ai-index-idx-a' };
const writer = { uri: 'workflow://enrichment', metadata: { run_id: 'exec-1' } };
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString();

const revisionOf = (source: DreamedKi): KiRevision => ({
  index: 'ai-index-idx-a',
  documentId: source.id,
  seqNo: 3,
  primaryTerm: 1,
  source,
});

describe('enrichmentReason', () => {
  const refresh = 30 * DAY_MS;

  it('is due when never enriched, changed since, or enriched longer ago than the refresh', () => {
    expect(enrichmentReason({ updated_at: daysAgo(1) }, refresh, NOW)).toBe('never_enriched');
    expect(
      enrichmentReason(
        { updated_at: daysAgo(1), attributes: { 'memory.enriched_at': daysAgo(2) } },
        refresh,
        NOW
      )
    ).toBe('changed');
    expect(
      enrichmentReason(
        { updated_at: daysAgo(40), attributes: { 'memory.enriched_at': daysAgo(40) } },
        refresh,
        NOW
      )
    ).toBe('stale');
  });

  it('is not due when enriched recently and unchanged since', () => {
    const enrichedAt = daysAgo(2);
    expect(
      enrichmentReason(
        { updated_at: enrichedAt, attributes: { 'memory.enriched_at': enrichedAt } },
        refresh,
        NOW
      )
    ).toBeUndefined();
  });
});

describe('selectEnrichmentCandidates', () => {
  const ki = (id: string, extra: Partial<DreamedKi> = {}) => ({
    _source: {
      id,
      type: 'entity.customer',
      title: id,
      updated_at: daysAgo(1),
      ...extra,
    },
  });

  it('returns the due KIs visible in the space, never enriched first, then by occurrences', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          ki('stale', {
            attributes: { 'memory.enriched_at': daysAgo(60) },
            updated_at: daysAgo(60),
          }),
          ki('fresh', { attributes: { 'memory.enriched_at': daysAgo(1) } }),
          ki('rare', { attributes: { 'memory.number_of_occurrences': 1 } }),
          ki('common', {
            attributes: { 'memory.number_of_occurrences': 9 },
            content: `Acme.\n\n## Access patterns\n- [x] y`,
          }),
          ki('deleted', { governance: { lifecycle: { status: 'deleted' } } }),
          ki('expired', { expires_at: daysAgo(1) }),
          ki('hidden', { permissions: { kibana: { privileges: [{ space: 'other' }] } } }),
        ],
      },
    } as never);

    const { candidates, scanned } = await selectEnrichmentCandidates({
      esClient,
      dest,
      spaceId: 'default',
      kiTypes: ['entity.*'],
      refreshAfterMs: 30 * DAY_MS,
      limit: 10,
      now: NOW,
    });

    expect(scanned).toBe(7);
    expect(candidates.map(({ id, reason }) => [id, reason])).toEqual([
      ['common', 'never_enriched'],
      ['rare', 'never_enriched'],
      ['stale', 'stale'],
    ]);
    expect(candidates[0]).toEqual(expect.objectContaining({ summary: 'Acme.', occurrences: 9 }));
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-a',
        collapse: { field: 'id' },
        sort: [{ updated_at: 'desc' }],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [{ prefix: { type: 'entity.' } }],
                  minimum_should_match: 1,
                  must_not: [{ terms: { type: ['memory.relationship'] } }],
                },
              },
              expect.anything(),
            ],
          },
        },
      }),
      { signal: undefined }
    );
  });

  it('returns at most the limit', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      hits: { hits: [ki('a'), ki('b'), ki('c')] },
    } as never);

    const { candidates } = await selectEnrichmentCandidates({
      esClient,
      dest,
      spaceId: 'default',
      kiTypes: ['entity.*'],
      refreshAfterMs: DAY_MS,
      limit: 2,
      now: NOW,
    });

    expect(candidates).toHaveLength(2);
  });
});

describe('withEvidenceReferences', () => {
  const evidence = (id: number): Evidence => ({
    id: `e-${id}`,
    source: 'esql:1',
    uri: `index://cases/${id}`,
    title: `Case ${id}`,
    text: '...',
  });

  it('keeps memory and other references, and adds cited evidence as derived_from', () => {
    expect(
      withEvidenceReferences(
        [
          { uri: 'ki://memory-1', relation: 'derived_from' },
          { uri: 'ki://entity-x', relation: 'relates_to', description: 'from' },
        ],
        [evidence(1)]
      )
    ).toEqual([
      { uri: 'ki://memory-1', relation: 'derived_from' },
      { uri: 'ki://entity-x', relation: 'relates_to', description: 'from' },
      { uri: 'index://cases/1', relation: 'derived_from', description: 'Case 1' },
    ]);
  });

  it('keeps only the newest evidence references, without duplicates', () => {
    const current = Array.from({ length: MAX_EVIDENCE_REFERENCES }, (_, i) => ({
      uri: `index://cases/${i}`,
      relation: 'derived_from' as const,
    }));
    const references = withEvidenceReferences(current, [evidence(3), evidence(100)]);

    expect(references).toHaveLength(MAX_EVIDENCE_REFERENCES);
    expect(references.filter(({ uri }) => uri === 'index://cases/3')).toHaveLength(1);
    expect(references.at(-1)?.uri).toBe('index://cases/100');
    expect(references.map(({ uri }) => uri)).not.toContain('index://cases/0');
  });
});

describe('applyEnrichment', () => {
  const evidence: Evidence[] = [
    {
      id: 'e-1',
      source: 'esql:1',
      uri: 'index://crm/acme',
      title: 'Acme CRM record',
      text: 'tier: gold',
    },
  ];
  const acme: DreamedKi = {
    id: 'entity-customer--acme',
    type: 'entity.customer',
    title: 'Acme',
    content: 'Acme is a customer.\n\n## Access patterns\n- [Orders] orders',
    updated_at: '2026-11-10T00:00:00.000Z',
    attributes: {
      'memory.number_of_occurrences': 3,
      access_patterns: [
        JSON.stringify({
          question_type: 'Orders',
          esql_template: 'FROM orders | WHERE customer == ?c | LIMIT 5',
          esql_example: 'FROM orders | WHERE customer == "acme" | LIMIT 5',
          returns: 'orders',
        }),
      ],
    },
    references: [{ uri: 'ki://memory-1', relation: 'derived_from' }],
    permissions: { kibana: { privileges: [{ space: 'default', name: ['x'], count: 1 }] } },
    governance: {
      provenance: { created_by: { uri: 'workflow://dreaming', metadata: {} } },
      lifecycle: { status: 'active' },
    },
  };
  const written = () =>
    jest.mocked(putKiRevision).mock.calls.map(([{ document }]) => document as DreamedKi);
  const apply = (overrides: Partial<Parameters<typeof applyEnrichment>[0]> = {}) =>
    applyEnrichment({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      aiIndexId: 'a',
      dest,
      spaceId: 'default',
      writer,
      kiId: acme.id,
      expectedUpdatedAt: acme.updated_at as string,
      change: {
        changed: true,
        content: 'Acme is a gold-tier customer.',
        citations: ['e-1', 'e-unknown'],
      },
      evidence,
      now: () => NOW,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(findKiRevision).mockResolvedValue(revisionOf(acme));
    jest.mocked(putKiRevision).mockResolvedValue(undefined);
  });

  it('replaces the content, keeps its access patterns and permissions, and cites the evidence', async () => {
    const outcome = await apply();

    expect(outcome).toEqual(
      expect.objectContaining({
        status: 'updated',
        improved: true,
        cited: ['e-1'],
        dropped_citations: ['e-unknown'],
      })
    );
    const [document] = written();
    expect(document.content).toBe(
      'Acme is a gold-tier customer.\n\n## Access patterns\n- [Orders] orders\n  Template: `FROM orders | WHERE customer == ?c | LIMIT 5`\n  Example: `FROM orders | WHERE customer == "acme" | LIMIT 5`'
    );
    expect(document.permissions).toEqual(acme.permissions);
    expect(document.attributes).toEqual({
      ...acme.attributes,
      'memory.enriched_at': NOW.toISOString(),
    });
    expect(document.references).toEqual([
      { uri: 'ki://memory-1', relation: 'derived_from' },
      { uri: 'index://crm/acme', relation: 'derived_from', description: 'Acme CRM record' },
    ]);
    expect(document.governance).toEqual({
      provenance: { created_by: acme.governance?.provenance?.created_by, updated_by: writer },
      lifecycle: { status: 'active' },
    });
    expect(jest.mocked(putKiRevision)).toHaveBeenCalledWith(
      expect.objectContaining({ existing: revisionOf(acme), failIfExists: false, refresh: true })
    );
  });

  it('only records that the KI was enriched when the improvement cites no evidence it was shown', async () => {
    const outcome = await apply({
      change: { changed: true, content: 'Acme is huge.', citations: ['e-unknown'] },
    });

    expect(outcome).toEqual(
      expect.objectContaining({ status: 'updated', improved: false, cited: [] })
    );
    const [document] = written();
    expect(document.content).toBe(acme.content);
    expect(document.references).toEqual(acme.references);
    expect(document.attributes?.['memory.enriched_at']).toBe(NOW.toISOString());
  });

  it('only records that the KI was enriched when the model found nothing to add', async () => {
    const outcome = await apply({ change: { changed: false }, evidence: [] });

    expect(outcome).toEqual(expect.objectContaining({ status: 'updated', improved: false }));
    expect(written()[0].content).toBe(acme.content);
  });

  it('corrects the title and description only when given', async () => {
    await apply({
      change: {
        changed: true,
        content: 'Acme Corp is a gold-tier customer.',
        title: 'Acme Corp',
        description: 'A gold-tier customer.',
        citations: ['e-1'],
      },
    });

    expect(written()[0]).toEqual(
      expect.objectContaining({ title: 'Acme Corp', description: 'A gold-tier customer.' })
    );
  });

  it('leaves a KI that changed since it was read, or no longer exists, for a later run', async () => {
    expect(await apply({ expectedUpdatedAt: '2026-11-01T00:00:00.000Z' })).toEqual(
      expect.objectContaining({
        status: 'skipped',
        reason: 'it changed since it was read; a later run improves it',
        improved: false,
      })
    );
    jest
      .mocked(findKiRevision)
      .mockResolvedValue(revisionOf({ ...acme, governance: { lifecycle: { status: 'deleted' } } }));
    expect(await apply()).toEqual(
      expect.objectContaining({ status: 'skipped', reason: 'it no longer exists' })
    );
    jest.mocked(findKiRevision).mockResolvedValue(undefined);
    expect(await apply()).toEqual(expect.objectContaining({ status: 'skipped' }));
    expect(putKiRevision).not.toHaveBeenCalled();
  });

  it('leaves alone a KI not visible in the space it runs in', async () => {
    jest
      .mocked(findKiRevision)
      .mockResolvedValue(
        revisionOf({ ...acme, permissions: { kibana: { privileges: [{ space: 'other' }] } } })
      );

    expect(await apply()).toEqual(
      expect.objectContaining({ status: 'skipped', reason: 'it is not visible in this space' })
    );
  });

  it('writes nothing on a dry run, and reports the KI as it would be', async () => {
    const outcome = await apply({ dryRun: true });

    expect(putKiRevision).not.toHaveBeenCalled();
    expect(outcome.status).toBe('updated');
    expect(outcome.status !== 'skipped' && outcome.document.content).toContain('gold-tier');
  });

  it('retries a concurrent write, and gives up once the KI changed', async () => {
    jest.mocked(putKiRevision).mockRejectedValueOnce(new KiConflictError('a', acme.id));
    jest
      .mocked(findKiRevision)
      .mockResolvedValueOnce(revisionOf(acme))
      .mockResolvedValueOnce(revisionOf({ ...acme, updated_at: '2026-11-16T11:00:00.000Z' }));

    expect(await apply()).toEqual(expect.objectContaining({ status: 'skipped' }));
    expect(putKiRevision).toHaveBeenCalledTimes(1);
  });
});
