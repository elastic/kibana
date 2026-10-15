/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { CASE_INDEX_NAME } from '../constants';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import { runIncrementalIdBackfill } from './runner';

const hit = (id: string, spaceId?: string) => ({
  _index: CASE_INDEX_NAME,
  _id: id,
  _source: spaceId ? { space_id: spaceId } : {},
  sort: [id],
});

const searchResponse = (hits: Array<ReturnType<typeof hit>>) =>
  ({ hits: { hits } } as unknown as Awaited<
    ReturnType<ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>['search']>
  >);

const caseSo = (id: string, incrementalId: number | null, extra: object = {}) => ({
  type: CASE_SAVED_OBJECT,
  id,
  attributes: { incremental_id: incrementalId },
  references: [],
  ...extra,
});

describe('runIncrementalIdBackfill', () => {
  const logger = loggerMock.create();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let writer: jest.Mocked<CasesAnalyticsV2WriterContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    savedObjectsClient = savedObjectsClientMock.create();
    writer = {
      upsertCase: jest.fn(),
      deleteCase: jest.fn(),
      bulkUpsertCases: jest.fn(),
      bulkDeleteCases: jest.fn(),
      bulkUpsertCasesAwait: jest.fn().mockResolvedValue(undefined),
    };
  });

  const run = (signal?: AbortSignal) =>
    runIncrementalIdBackfill({ esClient, savedObjectsClient, writer, logger, signal });

  it('queries only .cases docs missing case.incremental_id, tolerating a missing index', async () => {
    esClient.search.mockResolvedValueOnce(searchResponse([]));

    await expect(run()).resolves.toEqual({ repaired: 0 });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: CASE_INDEX_NAME,
        ignore_unavailable: true,
        query: { bool: { must_not: [{ exists: { field: 'case.incremental_id' } }] } },
      })
    );
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    expect(writer.bulkUpsertCasesAwait).not.toHaveBeenCalled();
  });

  it('re-emits only cases whose SO now has an incremental id, read from their own space', async () => {
    esClient.search.mockResolvedValueOnce(
      searchResponse([hit('numbered', 'space-a'), hit('unnumbered'), hit('deleted', 'space-b')])
    );
    const numbered = caseSo('numbered', 7);
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        numbered,
        caseSo('unnumbered', null),
        caseSo('deleted', null, {
          error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
        }),
      ],
    } as never);

    await expect(run()).resolves.toEqual({ repaired: 1 });

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
      { type: CASE_SAVED_OBJECT, id: 'numbered', namespaces: ['space-a'] },
      { type: CASE_SAVED_OBJECT, id: 'unnumbered', namespaces: ['default'] },
      { type: CASE_SAVED_OBJECT, id: 'deleted', namespaces: ['space-b'] },
    ]);
    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledWith([numbered]);
  });

  it('pages with search_after until a partial page is returned', async () => {
    const fullPage = Array.from({ length: 250 }, (_, i) => hit(`case-${i}`));
    esClient.search
      .mockResolvedValueOnce(searchResponse(fullPage))
      .mockResolvedValueOnce(searchResponse([hit('case-last')]));
    savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [] });

    await run();

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[0][0]).not.toHaveProperty('search_after');
    expect(esClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({ search_after: ['case-249'] })
    );
  });

  it('propagates a write failure so Task Manager retries the run', async () => {
    esClient.search.mockResolvedValueOnce(searchResponse([hit('numbered')]));
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [caseSo('numbered', 1)],
    } as never);
    writer.bulkUpsertCasesAwait.mockRejectedValueOnce(new Error('bulk failed'));

    await expect(run()).rejects.toThrow('bulk failed');
  });

  it('throws without searching when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(run(controller.signal)).rejects.toThrow('aborted');
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
