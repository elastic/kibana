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

    const versions = await manager.bulkGetVersions(['a']);

    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.mget).toHaveBeenCalledWith({
      docs: [
        { _index: OLDER_INDEX, _id: 'a', _source: false },
        { _index: NEWER_INDEX, _id: 'a', _source: false },
        { _index: LEGACY_INDEX, _id: 'a', _source: false },
      ],
    });
    expect(versions.a).toEqual({ index: OLDER_INDEX, seqNo: 4, primaryTerm: 1 });
  });

  it('searches only ids the realtime read missed', async () => {
    const { esClient, manager } = createManager();
    esClient.mget.mockResolvedValue({
      docs: [
        { _id: 'a', _index: OLDER_INDEX, found: false },
        { _id: 'a', _index: NEWER_INDEX, found: false },
        { _id: 'a', _index: LEGACY_INDEX, found: false },
      ],
    } as never);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          { _id: 'a', _index: '.ds-.workflows-executions-ds-000000', _seq_no: 2, _primary_term: 1 },
        ],
      },
    } as never);

    const versions = await manager.bulkGetVersions(['a']);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [DATA_STREAM, LEGACY_INDEX],
        query: { ids: { values: ['a'] } },
        seq_no_primary_term: true,
      })
    );
    expect(versions.a.index).toBe('.ds-.workflows-executions-ds-000000');
  });
});
