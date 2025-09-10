/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getSampleDocs } from './get_sample_docs';

describe('getSampleDocs', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  const createHit = ({
    id,
    fields,
    source,
    index = 'test-index',
  }: {
    id: string;
    index?: string;
    fields?: Record<string, any[]>;
    source?: Record<string, any>;
  }): SearchHit<Record<string, any>> => {
    return {
      _id: id,
      _index: index,
      _source: source ?? {},
      fields,
    };
  };

  const createResponse = (
    hits: Array<SearchHit<Record<string, any>>>,
    total?: number
  ): SearchResponse<Record<string, any>> => {
    return {
      hits: {
        hits,
        total: total ?? hits.length,
      },
    } as SearchResponse<Record<string, any>>;
  };

  it('calls esClient.search with the right parameters', async () => {
    esClient.search.mockResponse(createResponse([]));

    await getSampleDocs({
      index: 'test-index',
      size: 10,
      esClient,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'test-index',
        size: 10,
      })
    );
  });

  it('processes the source of a document', async () => {
    esClient.search.mockResponse(
      createResponse(
        [
          createHit({
            id: 'doc-1',
            index: 'idx-1',
            source: { foo: 42, bar: '9000', nested: { hello: 'dolly' } },
          }),
        ],
        10
      )
    );

    const { samples } = await getSampleDocs({
      index: 'test-index',
      size: 10,
      esClient,
    });

    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      id: 'doc-1',
      index: 'idx-1',
      values: {
        bar: ['9000'],
        foo: [42],
        'nested.hello': ['dolly'],
      },
    });
  });

  it('processes the fields of a document', async () => {
    esClient.search.mockResponse(
      createResponse(
        [
          createHit({
            id: 'doc-1',
            index: 'idx-1',
            fields: {
              foo: [42],
              bar: ['9000'],
              'nested.hello': ['dolly'],
            },
          }),
        ],
        10
      )
    );

    const { samples } = await getSampleDocs({
      index: 'test-index',
      size: 10,
      esClient,
    });

    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      id: 'doc-1',
      index: 'idx-1',
      values: {
        bar: ['9000'],
        foo: [42],
        'nested.hello': ['dolly'],
      },
    });
  });

  it('merges the fields and source of a the doc', async () => {
    esClient.search.mockResponse(
      createResponse(
        [
          createHit({
            id: 'doc-1',
            index: 'idx-1',
            fields: {
              foo: ['foo-from-fields'],
              bar: ['9000'],
              'nested.hello': ['dolly'],
            },
            source: {
              field1: 'value1',
              foo: 'foo-from-source',
            },
          }),
        ],
        10
      )
    );

    const { samples } = await getSampleDocs({
      index: 'test-index',
      size: 10,
      esClient,
    });

    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      id: 'doc-1',
      index: 'idx-1',
      values: {
        bar: ['9000'],
        field1: ['value1'],
        foo: ['foo-from-source'],
        'nested.hello': ['dolly'],
      },
    });
  });

  it('handles multiple documents', async () => {
    esClient.search.mockResponse(
      createResponse(
        [
          createHit({
            id: 'doc-1',
            index: 'idx-1',
            source: { field1: 'value1' },
          }),
          createHit({
            id: 'doc-2',
            index: 'idx-1',
            source: { field1: 'value2' },
          }),
        ],
        10
      )
    );

    const { samples } = await getSampleDocs({
      index: 'test-index',
      size: 10,
      esClient,
    });

    expect(samples).toHaveLength(2);
    expect(samples).toEqual([
      {
        id: 'doc-1',
        index: 'idx-1',
        values: {
          field1: ['value1'],
        },
      },
      {
        id: 'doc-2',
        index: 'idx-1',
        values: {
          field1: ['value2'],
        },
      },
    ]);
  });

  it('supports processing an empty response', async () => {
    esClient.search.mockResponse(createResponse([]));

    const { samples } = await getSampleDocs({
      index: 'test-index',
      size: 10,
      esClient,
    });

    expect(samples).toHaveLength(0);
  });
});
