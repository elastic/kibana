/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { findKiRevision, putKiRevision, type KiRevision } from '../ai_indices/ki_revision';
import type { Evidence } from '../../common/step_types/research';
import type { DreamedKi } from './dreamed_ki';
import { audienceKeyOf } from './permissions';
import { applyWikiPage, gatherWikiPage, memberIdsOf, searchRelatedKiIds } from './wiki';

jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  findKiRevision: jest.fn(),
  putKiRevision: jest.fn(),
}));

const NOW = new Date('2026-11-16T12:00:00.000Z');
const dest = { type: 'index' as const, value: 'ai-index-idx-a' };
const writer = { uri: 'workflow://wiki', metadata: { run_id: 'exec-1' } };
const logger = loggingSystemMock.createLogger();
const team = {
  kibana: { privileges: [{ space: 'default', name: ['ai_index:a/read'], count: 1 }] },
};
const otherTeam = {
  kibana: { privileges: [{ space: 'default', name: ['ai_index:b/read'], count: 1 }] },
};

const stored = new Map<string, DreamedKi>();
const store = (...kis: DreamedKi[]) => kis.forEach((ki) => stored.set(ki.id, ki));
const revisionOf = (source: DreamedKi): KiRevision => ({
  index: 'ai-index-idx-a',
  documentId: source.id,
  seqNo: 1,
  primaryTerm: 1,
  source,
});
const written = () =>
  jest.mocked(putKiRevision).mock.calls.map(([{ document }]) => document as DreamedKi);

const fact = (id: string, extra: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'fact.preference',
  title: `Fact ${id}`,
  content: `Content of ${id}`,
  permissions: team,
  ...extra,
});
const acmePage: DreamedKi = {
  id: 'wiki-acme',
  type: 'wiki.page',
  title: 'Acme',
  description: 'The customer Acme.',
  content: '# Acme',
  permissions: team,
  references: [
    { uri: 'ki://fact-old', relation: 'relates_to', description: 'member' },
    { uri: 'index://crm/acme', relation: 'derived_from', description: 'CRM' },
  ],
};

const searchReturning = (ids: string[]) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockResolvedValue({
    hits: { hits: ids.map((id) => ({ _source: { id } })) },
  } as never);
  return esClient;
};

beforeEach(() => {
  jest.clearAllMocks();
  stored.clear();
  jest.mocked(findKiRevision).mockImplementation(async ({ kiId }) => {
    const source = stored.get(kiId);
    return source ? revisionOf(source) : undefined;
  });
  jest.mocked(putKiRevision).mockResolvedValue(undefined);
});

describe('memberIdsOf', () => {
  it('reads the members of a page from its member references only', () => {
    expect(memberIdsOf(acmePage)).toEqual(['fact-old']);
  });
});

describe('searchRelatedKiIds', () => {
  it('searches semantically and by keywords, leaving out wiki pages', async () => {
    const esClient = searchReturning(['fact-1']);

    expect(
      await searchRelatedKiIds({
        esClient,
        dest,
        spaceId: 'default',
        kiTypes: ['fact.*'],
        query: 'acme',
        size: 10,
        logger,
      })
    ).toEqual(['fact-1']);
    const [request] = esClient.search.mock.calls[0] as [
      { query: { bool: Record<string, unknown> } }
    ];
    expect(request.query.bool.should).toEqual([
      { multi_match: { query: 'acme', fields: ['title^2', 'description', 'content'] } },
      { match: { 'title.semantic': { query: 'acme' } } },
      { match: { 'description.semantic': { query: 'acme' } } },
      { match: { 'content.semantic': { query: 'acme' } } },
    ]);
    expect(request.query.bool.must_not).toEqual([{ term: { type: 'wiki.page' } }]);
  });

  it('searches by keywords alone when semantic search is not available', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search
      .mockRejectedValueOnce(new Error('no inference endpoint'))
      .mockResolvedValueOnce({ hits: { hits: [{ _source: { id: 'fact-2' } }] } } as never);

    expect(
      await searchRelatedKiIds({
        esClient,
        dest,
        spaceId: 'default',
        kiTypes: ['fact.*'],
        query: 'acme',
        size: 10,
        logger,
      })
    ).toEqual(['fact-2']);
    const [request] = esClient.search.mock.calls[1] as [
      { query: { bool: Record<string, unknown> } }
    ];
    expect(request.query.bool.should).toHaveLength(1);
  });
});

describe('gatherWikiPage', () => {
  const gather = (overrides: Partial<Parameters<typeof gatherWikiPage>[0]> = {}) =>
    gatherWikiPage({
      esClient: searchReturning(['fact-related', 'fact-secret', 'fact-1']),
      aiIndexId: 'a',
      dest,
      spaceId: 'default',
      seedIds: ['fact-1'],
      memberQuery: 'acme',
      kiTypes: ['fact.*'],
      logger,
      ...overrides,
    });

  it('gathers the seeds, then related items of the same audience', async () => {
    store(fact('fact-1'), fact('fact-related'), fact('fact-secret', { permissions: otherTeam }));

    const gathered = await gather();

    expect(gathered.page).toBeUndefined();
    expect(gathered.members.map(({ id }) => id)).toEqual(['fact-1', 'fact-related']);
    expect(gathered.members[0]).toEqual({
      id: 'fact-1',
      type: 'fact.preference',
      title: 'Fact fact-1',
      content: 'Content of fact-1',
    });
    expect(gathered.dropped).toBe(1);
  });

  it('keeps the current members of an existing page, which sets the audience', async () => {
    store(acmePage, fact('fact-old'), fact('fact-1'), fact('fact-related'));

    const gathered = await gather({ pageRef: 'wiki-acme' });

    expect(gathered.page).toEqual({
      id: 'wiki-acme',
      title: 'Acme',
      description: 'The customer Acme.',
      content: '# Acme',
      member_ids: ['fact-old'],
    });
    expect(gathered.members.map(({ id }) => id)).toEqual(['fact-1', 'fact-old', 'fact-related']);
  });

  it('leaves out items of other types, inactive ones, and those over the cap', async () => {
    store(
      fact('fact-1'),
      fact('fact-related', { governance: { lifecycle: { status: 'deleted' } } }),
      fact('entity-x', { type: 'entity.customer' })
    );

    const gathered = await gather({
      esClient: searchReturning(['fact-related', 'entity-x']),
      maxMembers: 1,
    });

    expect(gathered.members.map(({ id }) => id)).toEqual(['fact-1']);
  });

  it('gathers nothing for a new page whose seeds are all gone', async () => {
    expect(await gather({ seedIds: ['missing'] })).toEqual({ members: [], dropped: 1 });
  });

  it('treats a ref that is not a wiki page as a new page', async () => {
    store(fact('fact-1'));

    const gathered = await gather({ pageRef: 'fact-1' });

    expect(gathered.page).toBeUndefined();
  });
});

describe('applyWikiPage', () => {
  const evidence: Evidence[] = [
    { id: 'e-1', source: 'esql:1', uri: 'index://crm/acme-2', title: 'CRM 2', text: '...' },
  ];
  const apply = (overrides: Partial<Parameters<typeof applyWikiPage>[0]> = {}) =>
    applyWikiPage({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      aiIndexId: 'a',
      dest,
      spaceId: 'default',
      writer,
      pageRef: 'new:1',
      change: {
        title: 'Acme',
        description: 'The customer Acme.',
        content: '# Acme\nLikes [email](ki://fact-1).',
        member_ids: ['fact-1', 'fact-2', 'fact-secret', 'wiki-other'],
        citations: ['e-1', 'e-9'],
      },
      evidence,
      now: () => NOW,
      ...overrides,
    });

  beforeEach(() => {
    store(fact('fact-1'), fact('fact-2'), fact('fact-secret', { permissions: otherTeam }), {
      ...acmePage,
      id: 'wiki-other',
      title: 'Other',
    });
  });

  it('creates a page seen by its members, linking them and citing the evidence', async () => {
    const outcome = await apply();
    const id = `wiki-acme--${audienceKeyOf([team])}`;

    expect(outcome).toEqual(
      expect.objectContaining({
        status: 'created',
        id,
        members: 2,
        cited: ['e-1'],
        dropped_citations: ['e-9'],
      })
    );
    expect(written()[0]).toEqual(
      expect.objectContaining({
        id,
        type: 'wiki.page',
        title: 'Acme',
        description: 'The customer Acme.',
        content: '# Acme\nLikes [email](ki://fact-1).',
        permissions: team,
        attributes: { 'wiki.member_count': 2, 'memory.enriched_at': NOW.toISOString() },
        references: [
          { uri: 'ki://fact-1', relation: 'relates_to', description: 'member' },
          { uri: 'ki://fact-2', relation: 'relates_to', description: 'member' },
          { uri: 'index://crm/acme-2', relation: 'derived_from', description: 'CRM 2' },
        ],
      })
    );
    expect(jest.mocked(putKiRevision)).toHaveBeenCalledWith(
      expect.objectContaining({ failIfExists: true })
    );
  });

  it('creates an open page from open items, without permissions', async () => {
    store(fact('fact-1', { permissions: undefined }), fact('fact-2', { permissions: undefined }));

    const outcome = await apply();

    expect(outcome.id).toBe('wiki-acme');
    expect(written()[0].permissions).toBeUndefined();
  });

  it('updates an existing page, replacing its members and keeping its evidence', async () => {
    store(acmePage);

    const outcome = await apply({ pageRef: 'wiki-acme' });

    expect(outcome).toEqual(expect.objectContaining({ status: 'updated', id: 'wiki-acme' }));
    expect(written()[0].references).toEqual([
      { uri: 'ki://fact-1', relation: 'relates_to', description: 'member' },
      { uri: 'ki://fact-2', relation: 'relates_to', description: 'member' },
      { uri: 'index://crm/acme', relation: 'derived_from', description: 'CRM' },
      { uri: 'index://crm/acme-2', relation: 'derived_from', description: 'CRM 2' },
    ]);
  });

  it('skips a page whose members are all gone, or that has no content', async () => {
    expect(
      await apply({ change: { title: 'Acme', content: '# Acme', member_ids: ['gone'] } })
    ).toEqual(
      expect.objectContaining({ status: 'skipped', reason: 'it ties no knowledge items together' })
    );
    expect(
      await apply({ change: { title: 'Acme', content: '  ', member_ids: ['fact-1'] } })
    ).toEqual(expect.objectContaining({ status: 'skipped', reason: 'it has no title or content' }));
    expect(putKiRevision).not.toHaveBeenCalled();
  });

  it('skips a page that did not change', async () => {
    store({
      ...acmePage,
      content: '# Acme',
      references: [{ uri: 'ki://fact-1', relation: 'relates_to', description: 'member' }],
    });

    expect(
      await apply({
        pageRef: 'wiki-acme',
        change: { title: 'Acme', content: '# Acme', member_ids: ['fact-1'] },
      })
    ).toEqual(expect.objectContaining({ status: 'skipped', reason: 'nothing changed' }));
  });

  it('never overwrites a knowledge item that is not a wiki page', async () => {
    const id = `wiki-acme--${audienceKeyOf([team])}`;
    store(fact(id));

    expect(await apply()).toEqual(
      expect.objectContaining({
        status: 'skipped',
        reason: `its id '${id}' belongs to a knowledge item that is not a wiki page`,
      })
    );
  });

  it('writes nothing on a dry run', async () => {
    const outcome = await apply({ dryRun: true });

    expect(outcome.status).toBe('created');
    expect(outcome.document?.type).toBe('wiki.page');
    expect(putKiRevision).not.toHaveBeenCalled();
  });
});
