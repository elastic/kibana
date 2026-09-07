/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { BulkOperationError } from '@kbn/storage-adapter';
import type { Improvement, ImprovementRevisionInput } from '../../common/http_api/improvements';
import { IMPROVEMENTS_INDEX } from '../../common/http_api/improvements';
import { ImprovementConflictError, ImprovementNotFoundError } from './errors';
import { ImprovementsService } from './service';
import { createImprovementsClient } from './storage';

jest.mock('./storage');

const createImprovementsClientMock = createImprovementsClient as jest.MockedFunction<
  typeof createImprovementsClient
>;

const makeInput = (
  overrides: Partial<ImprovementRevisionInput> = {}
): ImprovementRevisionInput => ({
  improvement_id: 'imp-1',
  ai_index_id: 'sales',
  status: 'suggested',
  title: 'Retire the unused enrichment workflow',
  rationale: 'It has produced no KIs in the window and every run of it errored.',
  action: 'remove_workflow',
  target: { workflow_id: 'wf-1' },
  payload: {},
  provenance: {
    agent_run_id: 'run-1',
    signal_ids: ['trace-1:span-1'],
    signal_spaces: ['default'],
    signal_window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
    signal_count: 1,
    tags: ['query_error'],
  },
  ...overrides,
});

const makeHead = (overrides: Partial<Improvement> = {}): Improvement => ({
  ...makeInput(),
  revision_id: 'rev-1',
  latest: true,
  '@timestamp': '2026-01-02T00:00:00.000Z',
  suggested_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const hitOf = (document: Improvement, seqNo = 4, primaryTerm = 1) => ({
  _id: document.revision_id,
  _source: document,
  _seq_no: seqNo,
  _primary_term: primaryTerm,
});

const searchResponse = (hits: ReturnType<typeof hitOf>[], total = hits.length) => ({
  hits: { hits, total: { value: total, relation: 'eq' } },
});

describe('ImprovementsService', () => {
  const client = {
    bulk: jest.fn(),
    search: jest.fn(),
  } as unknown as ReturnType<typeof createImprovementsClient>;

  const bulk = client.bulk as jest.Mock;
  const search = client.search as jest.Mock;

  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  let service: ImprovementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    createImprovementsClientMock.mockReturnValue(client);
    bulk.mockResolvedValue({ errors: false, items: [] });
    search.mockResolvedValue(searchResponse([]));
    service = new ImprovementsService({ esClient, logger });
  });

  it("binds the store to the caller's client, with no space dimension", () => {
    expect(createImprovementsClientMock).toHaveBeenCalledWith(esClient);
  });

  describe('write', () => {
    it('is a no-op for an empty batch', async () => {
      await service.write([]);
      expect(bulk).not.toHaveBeenCalled();
      expect(search).not.toHaveBeenCalled();
    });

    it('indexes a first revision keyed by revision_id, marked latest, with no predecessor', async () => {
      const [written] = await service.write([makeInput()]);

      expect(bulk).toHaveBeenCalledTimes(1);
      const [{ operations, refresh, throwOnFail }] = bulk.mock.calls[0];
      expect(operations).toHaveLength(1);
      expect(operations[0].index._id).toBe(written.revision_id);
      expect(operations[0].index.document).toMatchObject({
        improvement_id: 'imp-1',
        latest: true,
        status: 'suggested',
      });
      expect(operations[0].index.document.previous_revision_id).toBeUndefined();
      expect(refresh).toBe('wait_for');
      expect(throwOnFail).toBe(true);
    });

    it('defaults suggested_at and @timestamp to the write time', async () => {
      const [written] = await service.write([makeInput()]);
      expect(written.suggested_at).toBe(written['@timestamp']);
      expect(Date.parse(written['@timestamp'])).not.toBeNaN();
    });

    it('preserves a caller-supplied suggested_at', async () => {
      const [written] = await service.write([
        makeInput({ suggested_at: '2025-06-01T00:00:00.000Z' }),
      ]);
      expect(written.suggested_at).toBe('2025-06-01T00:00:00.000Z');
    });

    it('retires the prior head before appending, and links the new revision to it', async () => {
      const head = makeHead();
      search.mockResolvedValue(searchResponse([hitOf(head, 7, 2)]));

      const [written] = await service.write([makeInput()]);

      expect(bulk).toHaveBeenCalledTimes(2);
      const [clear] = bulk.mock.calls[0];
      expect(clear.operations).toEqual([
        {
          index: {
            _id: 'rev-1',
            document: { ...head, latest: false },
            if_seq_no: 7,
            if_primary_term: 2,
          },
        },
      ]);

      const [append] = bulk.mock.calls[1];
      expect(append.operations[0].index.document).toMatchObject({
        previous_revision_id: 'rev-1',
        latest: true,
      });
      expect(written.previous_revision_id).toBe('rev-1');
    });

    it('collapses duplicate lineages within one batch so they cannot race for the head', async () => {
      const [written] = await service.write([
        makeInput({ title: 'first' }),
        makeInput({ title: 'second' }),
      ]);

      const [append] = bulk.mock.calls[0];
      expect(append.operations).toHaveLength(1);
      expect(written.title).toBe('second');
    });

    it('reads heads under seq_no_primary_term, filtered to the current head', async () => {
      await service.write([makeInput()]);
      const [request] = search.mock.calls[0];
      expect(request.seq_no_primary_term).toBe(true);
      expect(request.query.bool.filter).toEqual([
        { term: { latest: true } },
        { terms: { improvement_id: ['imp-1'] } },
      ]);
    });

    it('leaves room for more than one head per lineage, newest first', async () => {
      await service.write([makeInput({ improvement_id: 'imp-1' })]);
      const [request] = search.mock.calls[0];
      // A lineage should have one head, but a lost creation race can leave two. Asking for exactly
      // one per lineage would hide the duplicate and leave it live forever.
      expect(request.size).toBeGreaterThan(1);
      expect(request.sort).toEqual([
        { '@timestamp': { order: 'desc' } },
        { revision_id: { order: 'desc' } },
      ]);
    });

    it('retires every head of a lineage, converging a duplicate left by a creation race', async () => {
      // Two runs created the same brand-new improvement_id: nothing guards a first revision.
      const newer = makeHead({ revision_id: 'rev-new', '@timestamp': '2026-01-03T00:00:00.000Z' });
      const older = makeHead({ revision_id: 'rev-old', '@timestamp': '2026-01-02T00:00:00.000Z' });
      search.mockResolvedValue(searchResponse([hitOf(newer, 9, 1), hitOf(older, 5, 1)]));

      const [written] = await service.write([makeInput()]);

      const [clear] = bulk.mock.calls[0];
      expect(clear.operations.map(({ index }: { index: { _id: string } }) => index._id)).toEqual([
        'rev-new',
        'rev-old',
      ]);
      expect(
        clear.operations.every(
          ({ index }: { index: { document: Improvement } }) => index.document.latest === false
        )
      ).toBe(true);
      // One head remains afterwards, and it continues from the newest of the two.
      expect(written.previous_revision_id).toBe('rev-new');
    });

    it('appends nothing for a lineage whose head moved under it', async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));
      bulk.mockResolvedValueOnce(clearResponse({ conflicted: ['rev-1'] }));

      // The retire failed, so this lineage still has its head; the re-proposal is stale anyway
      // now that someone has acted on it, so it is left for the next run.
      await expect(service.write([makeInput()])).resolves.toEqual([]);
      expect(bulk).toHaveBeenCalledTimes(1);
    });

    it('still appends the rest of the batch when one lineage loses its race', async () => {
      search.mockResolvedValue(
        searchResponse([
          hitOf(makeHead({ improvement_id: 'imp-1', revision_id: 'rev-1' })),
          hitOf(makeHead({ improvement_id: 'imp-2', revision_id: 'rev-2' })),
        ])
      );
      bulk.mockResolvedValueOnce(clearResponse({ ok: ['rev-2'], conflicted: ['rev-1'] }));

      const written = await service.write([
        makeInput({ improvement_id: 'imp-1' }),
        makeInput({ improvement_id: 'imp-2' }),
      ]);

      // imp-2's head was retired even though imp-1's operation conflicted, because a bulk applies
      // each operation independently. Abandoning the batch would leave imp-2 with no `latest`
      // revision at all: invisible to every read, and orphaned from any later successor.
      expect(written.map(({ improvement_id: improvementId }) => improvementId)).toEqual(['imp-2']);
      const [append] = bulk.mock.calls[1];
      expect(append.operations).toHaveLength(1);
      expect(append.operations[0].index.document).toMatchObject({
        improvement_id: 'imp-2',
        previous_revision_id: 'rev-2',
        latest: true,
      });
    });

    it('surfaces a non-conflict retire failure instead of reading it as contention', async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));
      bulk.mockResolvedValueOnce({
        errors: true,
        took: 1,
        items: [
          {
            index: {
              _index: IMPROVEMENTS_INDEX,
              _id: 'rev-1',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      });

      await expect(service.write([makeInput()])).rejects.toBeInstanceOf(BulkOperationError);
      expect(bulk).toHaveBeenCalledTimes(1);
    });

    it('keeps a non-conflict failure as itself rather than reporting a lost race', async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));
      bulk.mockRejectedValueOnce(new Error('cluster_block_exception'));

      await expect(service.write([makeInput()])).rejects.toThrow('cluster_block_exception');
    });
  });

  describe('list', () => {
    it('returns one entry per lineage by filtering on the head, newest first', async () => {
      const head = makeHead();
      search.mockResolvedValue(searchResponse([hitOf(head)], 3));

      const result = await service.list();

      expect(result).toEqual({ items: [head], total: 3 });
      const [request] = search.mock.calls[0];
      expect(request.query.bool.filter).toEqual([{ term: { latest: true } }]);
      expect(request.sort).toEqual([
        { '@timestamp': { order: 'desc' } },
        { revision_id: { order: 'desc' } },
      ]);
      expect(request.track_total_hits).toBe(true);
    });

    it('breaks @timestamp ties on a unique field, so paging cannot skip or repeat a row', async () => {
      // A batch shares one `@timestamp`, so every improvement a run produces sorts equal on it and
      // Elasticsearch leaves their relative order undefined — which `from`/`size` paging cannot
      // tolerate.
      const batch = await service.write([
        makeInput({ improvement_id: 'imp-1' }),
        makeInput({ improvement_id: 'imp-2' }),
      ]);
      expect(batch[0]['@timestamp']).toBe(batch[1]['@timestamp']);
      expect(batch[0].revision_id).not.toBe(batch[1].revision_id);

      await service.list();

      const [request] = search.mock.calls[search.mock.calls.length - 1];
      expect(request.sort[1]).toEqual({ revision_id: { order: 'desc' } });
    });

    it('filters by AI index and status when asked', async () => {
      await service.list({ aiIndexId: 'sales', status: ['suggested', 'failed'] });
      const [request] = search.mock.calls[0];
      expect(request.query.bool.filter).toEqual([
        { term: { latest: true } },
        { term: { ai_index_id: 'sales' } },
        { terms: { status: ['suggested', 'failed'] } },
      ]);
    });

    it('caps the page size', async () => {
      await service.list({ size: 5000 });
      expect(search.mock.calls[0][0].size).toBe(100);
    });
  });

  describe('get', () => {
    it('returns the head revision of the lineage', async () => {
      const head = makeHead();
      search.mockResolvedValue(searchResponse([hitOf(head)]));

      await expect(service.get('imp-1')).resolves.toEqual(head);
      expect(search.mock.calls[0][0].query.bool.filter).toEqual([
        { term: { latest: true } },
        { term: { improvement_id: 'imp-1' } },
      ]);
    });

    it('returns undefined for an unknown improvement', async () => {
      await expect(service.get('nope')).resolves.toBeUndefined();
    });
  });

  describe('historyFor', () => {
    it('returns every improvement for the AI index regardless of status, capped', async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));

      await service.historyFor('sales');

      const [request] = search.mock.calls[0];
      expect(request.query.bool.filter).toEqual([
        { term: { latest: true } },
        { term: { ai_index_id: 'sales' } },
      ]);
    });

    it('is not clamped by the review UI page size, but is capped by the briefing budget', async () => {
      await service.historyFor('sales');
      expect(search.mock.calls[0][0].size).toBe(200);

      await service.historyFor('sales', { size: 10_000 });
      expect(search.mock.calls[1][0].size).toBe(200);
    });
  });

  describe('transition', () => {
    it('appends an applied revision carrying the resolution and applied_at', async () => {
      const head = makeHead();
      search.mockResolvedValue(searchResponse([hitOf(head)]));

      const revision = await service.transition('imp-1', 'applied', {
        by: 'elastic',
        applied_target_id: 'wf-1',
      });

      expect(revision).toMatchObject({
        status: 'applied',
        latest: true,
        previous_revision_id: 'rev-1',
        resolution: { by: 'elastic', applied_target_id: 'wf-1' },
      });
      expect(revision.applied_at).toBe(revision['@timestamp']);
      expect(revision.rejected_at).toBeUndefined();
      expect(revision.revision_id).not.toBe(head.revision_id);
      // The content of the suggestion carries forward untouched.
      expect(revision.title).toBe(head.title);
      expect(revision.suggested_at).toBe(head.suggested_at);
    });

    it('stamps rejected_at on a rejection', async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));
      const revision = await service.transition('imp-1', 'rejected', { by: 'elastic' });
      expect(revision.rejected_at).toBe(revision['@timestamp']);
      expect(revision.applied_at).toBeUndefined();
    });

    it("keeps the reviewer's rejection reason, so the next run knows why it was turned down", async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));

      const revision = await service.transition('imp-1', 'rejected', {
        by: 'elastic',
        reason: 'the workflow is intentionally scoped to the last 7 days',
      });

      expect(revision.resolution).toEqual({
        by: 'elastic',
        reason: 'the workflow is intentionally scoped to the last 7 days',
      });
      // A rejection is a judgement, not a fault; `error` stays for a failed apply.
      expect(revision.resolution?.error).toBeUndefined();
    });

    it('drops the failure resolution when a failed improvement is retried into applied', async () => {
      const failed = makeHead({
        status: 'failed',
        resolution: { by: 'elastic', error: 'the workflow no longer exists' },
      });
      search.mockResolvedValue(searchResponse([hitOf(failed)]));

      const revision = await service.transition('imp-1', 'applied');

      // Carrying it forward would leave an applied improvement reporting an apply error.
      expect(revision.status).toBe('applied');
      expect(revision.resolution).toBeUndefined();
      expect(revision.applied_at).toBe(revision['@timestamp']);
    });

    it('drops rejected_at when a rejected improvement is reopened', async () => {
      const rejected = makeHead({
        status: 'rejected',
        rejected_at: '2026-01-03T00:00:00.000Z',
        resolution: { by: 'elastic', reason: 'not now' },
      });
      search.mockResolvedValue(searchResponse([rejected].map((head) => hitOf(head))));

      const revision = await service.transition('imp-1', 'applied', { by: 'elastic' });

      // Each head describes the status it is in; the rejection stays on the revision that made it.
      expect(revision.rejected_at).toBeUndefined();
      expect(revision.resolution).toEqual({ by: 'elastic' });
      expect(rejected.rejected_at).toBe('2026-01-03T00:00:00.000Z');
    });

    it('records a failed apply without claiming it was applied', async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));

      const revision = await service.transition('imp-1', 'failed', { error: 'invalid workflow' });

      expect(revision.status).toBe('failed');
      expect(revision.applied_at).toBeUndefined();
      expect(revision.rejected_at).toBeUndefined();
      expect(revision.resolution).toEqual({ error: 'invalid workflow' });
    });

    it('retires every head, so a transition converges a duplicated lineage', async () => {
      const newer = makeHead({ revision_id: 'rev-new', '@timestamp': '2026-01-03T00:00:00.000Z' });
      const older = makeHead({ revision_id: 'rev-old', '@timestamp': '2026-01-02T00:00:00.000Z' });
      search.mockResolvedValue(searchResponse([hitOf(newer, 9, 1), hitOf(older, 5, 1)]));

      const revision = await service.transition('imp-1', 'applied');

      const [clear] = bulk.mock.calls[0];
      expect(clear.operations).toHaveLength(2);
      expect(revision.previous_revision_id).toBe('rev-new');
    });

    it('rejects a transition on an unknown improvement', async () => {
      await expect(service.transition('nope', 'applied')).rejects.toBeInstanceOf(
        ImprovementNotFoundError
      );
      expect(bulk).not.toHaveBeenCalled();
    });

    it('lets only one of two concurrent reviewers win', async () => {
      search.mockResolvedValue(searchResponse([hitOf(makeHead())]));
      bulk.mockResolvedValueOnce(clearResponse({ conflicted: ['rev-1'] }));

      await expect(service.transition('imp-1', 'rejected')).rejects.toBeInstanceOf(
        ImprovementConflictError
      );
      // The losing reviewer appends nothing, so the log cannot end up with two heads.
      expect(bulk).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteByAiIndex', () => {
    it('removes every revision for the AI index, tolerating a missing index', async () => {
      await service.deleteByAiIndex('sales');

      expect(esClient.deleteByQuery).toHaveBeenCalledWith({
        index: IMPROVEMENTS_INDEX,
        query: { term: { ai_index_id: 'sales' } },
        conflicts: 'proceed',
        refresh: true,
        ignore_unavailable: true,
      });
    });

    it('treats a missing index as nothing to clean up', async () => {
      esClient.deleteByQuery.mockRejectedValueOnce(indexNotFound());
      await expect(service.deleteByAiIndex('sales')).resolves.toBeUndefined();
    });

    it('rethrows anything else, so a failed cleanup is not reported as success', async () => {
      esClient.deleteByQuery.mockRejectedValueOnce(new Error('cluster_block_exception'));
      await expect(service.deleteByAiIndex('sales')).rejects.toThrow('cluster_block_exception');
    });
  });
});

const indexNotFound = () =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'index_not_found_exception',
      request: {} as never,
    },
    warnings: [],
    body: 'index_not_found_exception',
    statusCode: 404,
  });

/**
 * A head-retirement bulk response. ES applies each operation independently, so a batch can come
 * back with some heads retired and others left alone because they lost their OCC race.
 */
const clearResponse = ({ ok = [], conflicted = [] }: { ok?: string[]; conflicted?: string[] }) => ({
  errors: conflicted.length > 0,
  took: 1,
  items: [
    ...ok.map((revisionId) => ({
      index: { _index: IMPROVEMENTS_INDEX, _id: revisionId, status: 200 },
    })),
    ...conflicted.map((revisionId) => ({
      index: {
        _index: IMPROVEMENTS_INDEX,
        _id: revisionId,
        status: 409,
        error: { type: 'version_conflict_engine_exception', reason: 'conflict' },
      },
    })),
  ],
});
