/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { DataStreamMetadataManager } from './data_stream_metadata_manager';
import { DocumentVersionManager } from './document_version_manager';

describe('DocumentVersionManager', () => {
  const DATA_STREAM = '.workflows-executions-ds';
  const OLDER_INDEX = '.ds-.workflows-executions-ds-000001';
  const NEWER_INDEX = '.ds-.workflows-executions-ds-000002';
  const LEGACY_INDEX = '.workflows-executions';

  const createManager = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const metadataManager = {
      getMetaOrLoad: () =>
        Promise.resolve({
          retentionTime: '90d',
          backingIndexes: [OLDER_INDEX, NEWER_INDEX],
          writableIndex: NEWER_INDEX,
        }),
    };
    const manager = new DocumentVersionManager({
      esClient,
      dataStreamName: DATA_STREAM,
      metadataManager: metadataManager as unknown as DataStreamMetadataManager,
      additionalIndexesToQuery: [LEGACY_INDEX],
    });
    return { esClient, manager };
  };

  it('reads the last two backing indexes before searching', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: OLDER_INDEX, found: true, _seq_no: 4, _primary_term: 1 },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        { _id: 'a', _index: LEGACY_INDEX, found: false },
      ],
    } as never);

    const lookup = await manager.bulkGetVersions(['a']);

    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [
        { _index: OLDER_INDEX, _id: 'a', _source: false },
        { _index: NEWER_INDEX, _id: 'a', _source: false },
        { _index: LEGACY_INDEX, _id: 'a', _source: false },
      ],
    });
    expect(lookup.versions.a).toEqual({ index: OLDER_INDEX, seqNo: 4, primaryTerm: 1 });
    expect(lookup.confirmedMissing.size).toBe(0);
  });

  it('searches only ids the realtime read missed', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: OLDER_INDEX, found: false },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        { _id: 'a', _index: LEGACY_INDEX, found: false },
        { _id: 'b', _index: OLDER_INDEX, found: true, _seq_no: 4, _primary_term: 1 },
        { _id: 'b', _index: NEWER_INDEX, found: false },
        { _id: 'b', _index: LEGACY_INDEX, found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          { _id: 'a', _index: '.ds-.workflows-executions-ds-000000', _seq_no: 2, _primary_term: 1 },
        ],
      },
    } as never);

    const lookup = await manager.bulkGetVersions(['a', 'b']);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [DATA_STREAM, LEGACY_INDEX],
        query: { ids: { values: ['a'] } },
        seq_no_primary_term: true,
      })
    );
    expect(lookup.versions.a.index).toBe('.ds-.workflows-executions-ds-000000');
    expect(lookup.versions.b).toEqual({ index: OLDER_INDEX, seqNo: 4, primaryTerm: 1 });
    expect(lookup.confirmedMissing.size).toBe(0);
  });

  it('confirms an id is missing only when every read says it is absent', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: OLDER_INDEX, found: false },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        { _id: 'a', _index: LEGACY_INDEX, found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
    } as never);

    const lookup = await manager.bulkGetVersions(['a']);

    expect(lookup.versions).toEqual({});
    expect([...lookup.confirmedMissing]).toEqual(['a']);
  });

  it('confirms a miss when the legacy index does not exist', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: OLDER_INDEX, found: false },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        {
          _id: 'a',
          _index: LEGACY_INDEX,
          error: { type: 'index_not_found_exception' },
        },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
    } as never);

    const lookup = await manager.bulkGetVersions(['a']);

    expect(lookup.versions).toEqual({});
    expect([...lookup.confirmedMissing]).toEqual(['a']);
  });

  it('does not confirm a miss when a backing index is missing', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'a',
          _index: OLDER_INDEX,
          error: { type: 'index_not_found_exception' },
        },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        { _id: 'a', _index: LEGACY_INDEX, found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
    } as never);

    const lookup = await manager.bulkGetVersions(['a']);

    expect(lookup.versions).toEqual({});
    expect(lookup.confirmedMissing.size).toBe(0);
  });

  it('does not confirm a miss when mget returns an error for the id', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: OLDER_INDEX, error: { type: 'shard_not_available_exception' } },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        { _id: 'a', _index: LEGACY_INDEX, found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
    } as never);

    const lookup = await manager.bulkGetVersions(['a']);

    expect(lookup.versions).toEqual({});
    expect(lookup.confirmedMissing.size).toBe(0);
  });

  it('does not confirm a miss when the search is incomplete', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: OLDER_INDEX, found: false },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        { _id: 'a', _index: LEGACY_INDEX, found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      timed_out: true,
      _shards: { total: 2, successful: 1, skipped: 0, failed: 1 },
      hits: { hits: [] },
    } as never);

    const lookup = await manager.bulkGetVersions(['a']);

    expect(lookup.versions).toEqual({});
    expect(lookup.confirmedMissing.size).toBe(0);
  });
});
