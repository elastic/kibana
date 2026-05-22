/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  executeAndDecodeSource,
  latestSourceFrom,
  pickLatestPerGroup,
} from './latest_source_query';

describe('pickLatestPerGroup', () => {
  it('emits the expected INLINE STATS reduction for tuple group-bys', () => {
    const query = pickLatestPerGroup(latestSourceFrom('.streams-knowledge-indicators', 'default'), [
      'stream.name',
      'type',
      'id',
    ]);

    const printed = query.print();

    expect(printed).toContain('INLINE STATS latest_ts = MAX(@timestamp) BY');
    expect(printed).toContain('INLINE STATS tiebreaker_id = MAX(_id) BY');
    expect(printed).toContain('BY `stream.name`, type, id');
  });
});

describe('executeAndDecodeSource', () => {
  const buildEsClient = (queryMock: jest.Mock): ElasticsearchClient =>
    ({ esql: { query: queryMock } } as unknown as ElasticsearchClient);

  it('returns empty hits when the backing data stream does not exist yet', async () => {
    const queryMock = jest
      .fn()
      .mockRejectedValue(
        new Error(
          'verification_exception Root causes: verification_exception: Unknown index [.significant_events-knowledge_indicators]'
        )
      );

    const query = latestSourceFrom('.significant_events-knowledge_indicators', 'default').keep(
      '_source'
    );

    const { hits } = await executeAndDecodeSource<{ id: string }>(buildEsClient(queryMock), query);

    expect(hits).toEqual([]);
  });

  it('rethrows non-missing-index ES|QL errors', async () => {
    const queryMock = jest
      .fn()
      .mockRejectedValue(new Error('verification_exception: Unknown column [nonexistent.field]'));

    const query = latestSourceFrom('.significant_events-knowledge_indicators', 'default').keep(
      '_source'
    );

    await expect(
      executeAndDecodeSource<{ id: string }>(buildEsClient(queryMock), query)
    ).rejects.toThrow('Unknown column');
  });
});
