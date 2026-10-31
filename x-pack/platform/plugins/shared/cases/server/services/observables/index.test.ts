/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/transport';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Observable } from '../../../common/types/domain';
import { createObservablesStorageClientMock } from '../mocks';
import { ObservablesService } from '.';
import { generateObservableDocumentId } from './observable_id';

describe('ObservablesService', () => {
  const caseId = 'case-1';
  const spaceId = 'default';
  const owner = 'securitySolution';

  const observable: Observable = {
    id: 'legacy-1',
    typeKey: 'type-1',
    value: '1.1.1.1',
    description: 'first',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
  };
  const observableId = generateObservableDocumentId({ spaceId, caseId, ...observable });

  const bulkError = (status: number) => ({
    errors: true,
    items: [{ create: { status, error: { type: 'some_error', reason: 'boom' } } }],
  });

  let storageClient: ReturnType<typeof createObservablesStorageClientMock>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let service: ObservablesService;

  beforeEach(() => {
    storageClient = createObservablesStorageClientMock();
    logger = loggingSystemMock.createLogger();
    service = new ObservablesService({ storageClient, logger });
  });

  describe('createObservables', () => {
    it('writes one create-only document per observable with the ids callers know in legacy_id', async () => {
      await service.createObservables({
        caseId,
        spaceId,
        owner,
        observables: [observable],
        source: 'api',
      });

      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            create: {
              _id: observableId,
              document: {
                case_id: caseId,
                space_id: spaceId,
                owner,
                type_key: 'type-1',
                value: '1.1.1.1',
                description: 'first',
                legacy_id: 'legacy-1',
                source: 'api',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
              },
            },
          },
        ],
      });
    });

    it('omits an empty or null description', async () => {
      await service.createObservables({
        caseId,
        spaceId,
        owner,
        observables: [
          { ...observable, description: null },
          { ...observable, value: '2.2.2.2', description: '' },
        ],
        source: 'api',
      });

      const [{ operations }] = storageClient.bulk.mock.calls[0];
      operations.forEach((operation) =>
        expect((operation as { create: { document: object } }).create.document).not.toHaveProperty(
          'description'
        )
      );
    });

    it('does not call Elasticsearch when there is nothing to write', async () => {
      await service.createObservables({ caseId, spaceId, owner, observables: [], source: 'api' });

      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('treats an existing document (409) as success because the id is deterministic', async () => {
      storageClient.bulk.mockResolvedValue(bulkError(409) as never);

      await expect(
        service.createObservables({
          caseId,
          spaceId,
          owner,
          observables: [observable],
          source: 'api',
        })
      ).resolves.toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    // Failure scenario: Elasticsearch rejects the write (for example missing index privileges), so the
    // caller must be told in order to flag the case as out of sync.
    it('throws and logs when a document fails for a reason other than a conflict', async () => {
      storageClient.bulk.mockResolvedValue(bulkError(403) as never);

      await expect(
        service.createObservables({
          caseId,
          spaceId,
          owner,
          observables: [observable],
          source: 'api',
        })
      ).rejects.toThrow('Failed to write 1 observables to the observables index: boom');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to write 1 of 1 observables of case case-1 to the observables index'
      );
    });

    it('propagates a rejected bulk request', async () => {
      storageClient.bulk.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.createObservables({
          caseId,
          spaceId,
          owner,
          observables: [observable],
          source: 'api',
        })
      ).rejects.toThrow('connection refused');
    });
  });

  describe('deleteObservables', () => {
    it('deletes by the deterministic id', async () => {
      await service.deleteObservables({ caseId, spaceId, observables: [observable] });

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [{ delete: { _id: observableId } }],
      });
    });

    it('does not call Elasticsearch when there is nothing to delete', async () => {
      await service.deleteObservables({ caseId, spaceId, observables: [] });

      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('treats a missing document (404) as success', async () => {
      storageClient.bulk.mockResolvedValue({
        errors: true,
        items: [{ delete: { status: 404, error: { type: 'not_found', reason: 'gone' } } }],
      } as never);

      await expect(
        service.deleteObservables({ caseId, spaceId, observables: [observable] })
      ).resolves.toBeUndefined();
    });

    it('throws when a delete fails for another reason', async () => {
      storageClient.bulk.mockResolvedValue({
        errors: true,
        items: [{ delete: { status: 500, error: { type: 'boom', reason: 'shard failure' } } }],
      } as never);

      await expect(
        service.deleteObservables({ caseId, spaceId, observables: [observable] })
      ).rejects.toThrow('shard failure');
    });
  });

  describe('updateObservable', () => {
    it('creates the new document and deletes the old one when the value changes', async () => {
      const next = { ...observable, value: '2.2.2.2' };
      const nextId = generateObservableDocumentId({ spaceId, caseId, ...next });

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next,
        source: 'api',
      });

      expect(storageClient.bulk).toHaveBeenCalledTimes(2);
      expect(storageClient.bulk).toHaveBeenNthCalledWith(1, {
        operations: [
          {
            create: {
              _id: nextId,
              document: expect.objectContaining({ value: '2.2.2.2', legacy_id: 'legacy-1' }),
            },
          },
        ],
      });
      expect(storageClient.bulk).toHaveBeenNthCalledWith(2, {
        operations: [{ delete: { _id: observableId } }],
      });
    });

    it('does not delete the old document when creating the new one fails', async () => {
      storageClient.bulk.mockResolvedValueOnce(bulkError(500) as never);

      await expect(
        service.updateObservable({
          caseId,
          spaceId,
          owner,
          previous: observable,
          next: { ...observable, value: '2.2.2.2' },
          source: 'api',
        })
      ).rejects.toThrow('boom');
      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('rewrites the same document and keeps its original source when only the description changes', async () => {
      storageClient.get.mockResolvedValue({ _source: { source: 'auto_extract' } } as never);

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next: { ...observable, description: 'edited', updatedAt: '2026-02-01T00:00:00.000Z' },
        source: 'api',
      });

      expect(storageClient.get).toHaveBeenCalledWith({ id: observableId });
      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            index: {
              _id: observableId,
              document: expect.objectContaining({
                description: 'edited',
                source: 'auto_extract',
                updated_at: '2026-02-01T00:00:00.000Z',
              }),
            },
          },
        ],
      });
    });

    // Failure scenario: the index is behind the case and never received this observable.
    it('falls back to the given source when the existing document is missing', async () => {
      storageClient.get.mockRejectedValue({ meta: { statusCode: 404 } });

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next: { ...observable, description: 'edited' },
        source: 'workflow',
      });

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            index: { _id: observableId, document: expect.objectContaining({ source: 'workflow' }) },
          },
        ],
      });
    });

    // The adapter's `get` throws this exact ResponseError shape when no document matches, which is
    // also what the very first edit after deployment sees: the index does not exist yet.
    it('falls back to the given source when the adapter reports a missing document', async () => {
      storageClient.get.mockRejectedValue(
        new errors.ResponseError({
          meta: {
            aborted: false,
            attempts: 1,
            connection: null,
            context: null,
            name: 'resource_not_found_exception',
            request: {} as unknown as DiagnosticResult['meta']['request'],
          },
          warnings: [],
          body: 'resource_not_found_exception',
          statusCode: 404,
        })
      );

      await service.updateObservable({
        caseId,
        spaceId,
        owner,
        previous: observable,
        next: { ...observable, description: 'edited' },
        source: 'agent',
      });

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _id: observableId, document: expect.objectContaining({ source: 'agent' }) } },
        ],
      });
    });

    it('propagates a lookup failure that is not a 404 without writing', async () => {
      storageClient.get.mockRejectedValue({ meta: { statusCode: 503 } });

      await expect(
        service.updateObservable({
          caseId,
          spaceId,
          owner,
          previous: observable,
          next: { ...observable, description: 'edited' },
          source: 'api',
        })
      ).rejects.toEqual({ meta: { statusCode: 503 } });
      expect(storageClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('syncCase', () => {
    const searchHits = (hits: Array<{ _id: string; _source?: unknown }>) =>
      ({ hits: { hits } } as never);

    const inSyncDocument = {
      case_id: caseId,
      space_id: spaceId,
      owner,
      type_key: 'type-1',
      value: '1.1.1.1',
      description: 'first',
      legacy_id: 'legacy-1',
      source: 'api' as const,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    it('creates the documents that are missing, recording the given source', async () => {
      storageClient.search
        .mockResolvedValueOnce(searchHits([]))
        .mockResolvedValueOnce(searchHits([]));

      const result = await service.syncCase({
        caseId,
        spaceId,
        owner,
        observables: [observable],
        source: 'migration',
      });

      expect(result).toEqual({ created: 1, updated: 0, deleted: 0 });
      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            create: {
              _id: observableId,
              document: { ...inSyncDocument, source: 'migration' },
            },
          },
        ],
      });
    });

    it('deletes the documents of the case that are not among the observables', async () => {
      storageClient.search
        .mockResolvedValueOnce(searchHits([{ _id: 'extra-1' }, { _id: 'extra-2' }]))
        .mockResolvedValueOnce(searchHits([]))
        .mockResolvedValueOnce(searchHits([{ _id: observableId, _source: inSyncDocument }]));

      const result = await service.syncCase({
        caseId,
        spaceId,
        owner,
        observables: [observable],
        source: 'migration',
      });

      expect(result).toEqual({ created: 0, updated: 0, deleted: 2 });
      expect(storageClient.search.mock.calls[0][0]).toMatchObject({
        // The storage adapter throws on a hit without a source object, so the source is never excluded.
        _source: ['case_id'],
        query: {
          bool: {
            filter: [{ term: { case_id: caseId } }, { term: { space_id: spaceId } }],
            must_not: [{ ids: { values: [observableId] } }],
          },
        },
      });
      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [{ delete: { _id: 'extra-1' } }, { delete: { _id: 'extra-2' } }],
      });
    });

    it('does not write when the index already matches the observables', async () => {
      storageClient.search
        .mockResolvedValueOnce(searchHits([]))
        .mockResolvedValueOnce(searchHits([{ _id: observableId, _source: inSyncDocument }]));

      const result = await service.syncCase({
        caseId,
        spaceId,
        owner,
        observables: [observable],
        source: 'migration',
      });

      expect(result).toEqual({ created: 0, updated: 0, deleted: 0 });
      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('rewrites a document that differs, keeping the source it was added with', async () => {
      storageClient.search.mockResolvedValueOnce(searchHits([])).mockResolvedValueOnce(
        searchHits([
          {
            _id: observableId,
            _source: { ...inSyncDocument, description: 'stale', source: 'workflow' },
          },
        ])
      );

      const result = await service.syncCase({
        caseId,
        spaceId,
        owner,
        observables: [observable],
        source: 'migration',
      });

      expect(result).toEqual({ created: 0, updated: 1, deleted: 0 });
      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _id: observableId, document: { ...inSyncDocument, source: 'workflow' } } },
        ],
      });
    });

    it('writes one document for rows that share a type and value, keeping the first id', async () => {
      storageClient.search
        .mockResolvedValueOnce(searchHits([]))
        .mockResolvedValueOnce(searchHits([]));

      const result = await service.syncCase({
        caseId,
        spaceId,
        owner,
        observables: [observable, { ...observable, id: 'legacy-2' }],
        source: 'migration',
      });

      expect(result.created).toBe(1);
      const [{ operations }] = storageClient.bulk.mock.calls[0];
      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject({ create: { document: { legacy_id: 'legacy-1' } } });
    });

    it('removes every document of the case when there are no observables', async () => {
      storageClient.search
        .mockResolvedValueOnce(searchHits([{ _id: 'extra-1' }]))
        .mockResolvedValueOnce(searchHits([]));

      const result = await service.syncCase({
        caseId,
        spaceId,
        owner,
        observables: [],
        source: 'migration',
      });

      expect(result).toEqual({ created: 0, updated: 0, deleted: 1 });
      expect(storageClient.search.mock.calls[0][0]).toMatchObject({
        query: { bool: { filter: expect.any(Array) } },
      });
      expect(
        (storageClient.search.mock.calls[0][0] as { query: { bool: object } }).query.bool
      ).not.toHaveProperty('must_not');
      expect(storageClient.search).toHaveBeenCalledTimes(2);
    });

    it('treats a document that already exists (409) as success', async () => {
      storageClient.search
        .mockResolvedValueOnce(searchHits([]))
        .mockResolvedValueOnce(searchHits([]));
      storageClient.bulk.mockResolvedValue(bulkError(409) as never);

      await expect(
        service.syncCase({ caseId, spaceId, owner, observables: [observable], source: 'migration' })
      ).resolves.toEqual({ created: 1, updated: 0, deleted: 0 });
    });

    it('throws when a document fails for a reason other than a conflict', async () => {
      storageClient.search
        .mockResolvedValueOnce(searchHits([]))
        .mockResolvedValueOnce(searchHits([]));
      storageClient.bulk.mockResolvedValue(bulkError(503) as never);

      await expect(
        service.syncCase({ caseId, spaceId, owner, observables: [observable], source: 'migration' })
      ).rejects.toThrow('Failed to write 1 observables to the observables index: boom');
    });

    it('passes the abort signal to Elasticsearch', async () => {
      const { signal } = new AbortController();
      storageClient.search
        .mockResolvedValueOnce(searchHits([]))
        .mockResolvedValueOnce(searchHits([]));

      await service.syncCase({
        caseId,
        spaceId,
        owner,
        observables: [observable],
        source: 'migration',
        signal,
      });

      expect(storageClient.search).toHaveBeenCalledWith(expect.anything(), { signal });
      expect(storageClient.bulk).toHaveBeenCalledWith(expect.anything(), { signal });
    });
  });

  describe('deleteCaseDocuments', () => {
    it('deletes in rounds until no document of the case is left', async () => {
      storageClient.search
        .mockResolvedValueOnce({ hits: { hits: [{ _id: 'a' }, { _id: 'b' }] } } as never)
        .mockResolvedValueOnce({ hits: { hits: [{ _id: 'c' }] } } as never)
        .mockResolvedValueOnce({ hits: { hits: [] } } as never);

      await expect(service.deleteCaseDocuments({ caseId, spaceId })).resolves.toBe(3);
      expect(storageClient.bulk).toHaveBeenCalledTimes(2);
    });

    it('gives up instead of looping forever when documents keep coming back', async () => {
      storageClient.search.mockResolvedValue({ hits: { hits: [{ _id: 'a' }] } } as never);

      await expect(service.deleteCaseDocuments({ caseId, spaceId })).rejects.toThrow(
        'Could not remove all extra observables of case case-1'
      );
    });
  });

  describe('listCaseKeys', () => {
    it('returns the cases of a page and where the next page starts', async () => {
      storageClient.search.mockResolvedValue({
        aggregations: {
          cases: {
            after_key: { case_id: 'case-2', space_id: 'space-b' },
            buckets: [
              { key: { case_id: 'case-1', space_id: 'default' }, doc_count: 3 },
              { key: { case_id: 'case-2', space_id: 'space-b' }, doc_count: 1 },
            ],
          },
        },
      } as never);

      await expect(
        service.listCaseKeys({ size: 2, after: { caseId: 'case-0', spaceId: 'default' } })
      ).resolves.toEqual({
        cases: [
          { caseId: 'case-1', spaceId: 'default' },
          { caseId: 'case-2', spaceId: 'space-b' },
        ],
        after: { caseId: 'case-2', spaceId: 'space-b' },
      });
      expect(storageClient.search.mock.calls[0][0]).toMatchObject({
        aggs: { cases: { composite: { after: { case_id: 'case-0', space_id: 'default' } } } },
      });
    });

    it('returns an empty page when the index has no cases', async () => {
      storageClient.search.mockResolvedValue({ aggregations: { cases: { buckets: [] } } } as never);

      await expect(service.listCaseKeys({ size: 10 })).resolves.toEqual({
        cases: [],
        after: undefined,
      });
    });
  });

  describe('findObservables', () => {
    const hit = (id: string, document: Record<string, unknown>, sort: unknown[] = []) => ({
      _id: id,
      _index: '.kibana-cases-observables',
      _source: {
        case_id: caseId,
        space_id: spaceId,
        owner,
        type_key: 'type-1',
        value: id,
        source: 'api',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        ...document,
      },
      sort,
    });
    const search = (hits: ReturnType<typeof hit>[], total = hits.length) =>
      storageClient.search.mockResolvedValue({
        hits: { hits, total: { value: total, relation: 'eq' } },
      } as unknown as Awaited<ReturnType<typeof storageClient.search>>);
    const find = (overrides: Partial<Parameters<ObservablesService['findObservables']>[0]> = {}) =>
      service.findObservables({
        caseId,
        spaceId,
        owner,
        sortField: 'created',
        sortOrder: 'asc',
        perPage: 2,
        ...overrides,
      });

    it('only looks at the case in its space and owner, whatever else is asked', async () => {
      search([]);

      await find();

      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { term: { case_id: caseId } },
                { term: { space_id: spaceId } },
                { term: { owner } },
              ],
            },
          },
        })
      );
    });

    it('adds the type keys to the filter only when there are some', async () => {
      search([]);

      await find({ typeKeys: ['type-1', 'type-2'] });
      await find({ typeKeys: [] });

      const [withTypes, withoutTypes] = storageClient.search.mock.calls.map(
        ([request]) => (request.query as { bool: { filter: unknown[] } }).bool.filter
      );
      expect(withTypes).toContainEqual({ terms: { type_key: ['type-1', 'type-2'] } });
      expect(withoutTypes).toHaveLength(3);
    });

    it('sorts with a unique ending, counts exactly and asks for one more than a page', async () => {
      search([]);

      await find({ sortField: 'value', sortOrder: 'desc', perPage: 25 });

      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 26,
          track_total_hits: true,
          sort: [{ value: 'desc' }, { type_key: 'asc' }],
        })
      );
    });

    it('never pages with from', async () => {
      search([]);

      await find({ searchAfter: ['a', 'b'] });

      expect(storageClient.search.mock.calls[0][0]).not.toHaveProperty('from');
    });

    it('continues after the sort values of the previous page', async () => {
      search([]);

      await find({ searchAfter: ['2026-01-01T00:00:00.000Z', 'type-1', 'a'] });

      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search_after: ['2026-01-01T00:00:00.000Z', 'type-1', 'a'],
        })
      );
    });

    it('does not send search_after for a first page', async () => {
      search([]);

      await find();

      expect(storageClient.search.mock.calls[0][0]).not.toHaveProperty('search_after');
    });

    it('returns a full page and the sort values of its last observable when more follow', async () => {
      search(
        [
          hit('doc-1', { legacy_id: 'legacy-1' }, ['s1']),
          hit('doc-2', {}, ['s2']),
          hit('doc-3', {}, ['s3']),
        ],
        5
      );

      const result = await find();

      expect(result.observables.map(({ id }) => id)).toEqual(['legacy-1', 'doc-2']);
      expect(result.total).toBe(5);
      expect(result.searchAfter).toEqual(['s2']);
    });

    it('has no next page when the observables fit the page', async () => {
      search([hit('doc-1', {}, ['s1']), hit('doc-2', {}, ['s2'])]);

      const result = await find();

      expect(result.observables).toHaveLength(2);
      expect(result.searchAfter).toBeUndefined();
    });

    it('returns nothing for a case that has no documents, as when the index does not exist yet', async () => {
      search([]);

      expect(await find()).toEqual({ observables: [], total: 0, searchAfter: undefined });
    });

    it('lets a failed search fail the request instead of showing an empty list', async () => {
      // Failure scenario: Elasticsearch rejects the search while the index is the source of truth.
      storageClient.search.mockRejectedValue(new Error('search_phase_execution_exception'));

      await expect(find()).rejects.toThrow('search_phase_execution_exception');
    });
  });
});
