/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { Parser } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  MAX_AI_INDEX_DESCRIBE_TAG_COUNTS,
  MAX_AI_INDEX_DESCRIBE_TYPE_COUNTS,
} from '../../common/constants';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { describeAiIndexAggregations } from './describe_aggregations';
import type { AiIndexField } from './types';

const field = (path: string, aggregatable: boolean, type = 'keyword'): AiIndexField => ({
  path,
  type,
  searchable: true,
  aggregatable,
});

const esResponseError = (statusCode: number, type: string) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({ statusCode, body: { error: { type } } })
  );

const LIFECYCLE =
  '| WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active"\n| WHERE expires_at IS NULL OR expires_at > NOW()';

const emptyResponse = { columns: [], values: [] };

describe('describeAiIndexAggregations', () => {
  const esqlQuery = jest.fn();
  const esClient = { esql: { query: esqlQuery } } as unknown as ElasticsearchClient;
  const dest: AiIndexDest = { type: 'index', value: 'ai-index-idx-*' };
  const params = { esClient, dest, spaceId: 'team-a' };
  const queries = () => esqlQuery.mock.calls.map(([request]) => request.query as string);

  beforeEach(() => {
    esqlQuery.mockReset();
    esqlQuery.mockResolvedValue(emptyResponse);
  });

  it('skips the queries when neither type nor tags is aggregatable', async () => {
    const result = await describeAiIndexAggregations({
      ...params,
      fields: [field('type', false), field('title', true)],
    });

    expect(esqlQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ kiTypeCounts: [], tagCounts: [] });
  });

  it('skips fields whose type conflicts across indices or is not a keyword', async () => {
    const result = await describeAiIndexAggregations({
      ...params,
      fields: [field('type', true, 'conflict'), field('tags', true, 'long')],
    });

    expect(esqlQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ kiTypeCounts: [], tagCounts: [] });
  });

  it('accepts every keyword-family type', async () => {
    await describeAiIndexAggregations({
      ...params,
      fields: [field('type', true, 'constant_keyword'), field('tags', true, 'wildcard')],
    });

    expect(queries()).toHaveLength(2);
  });

  it('runs one space-filtered lifecycle query per field', async () => {
    await describeAiIndexAggregations({
      ...params,
      fields: [field('type', true), field('tags', true)],
    });

    expect(esqlQuery).toHaveBeenCalledTimes(2);
    expect(esqlQuery).toHaveBeenCalledWith({
      query: [
        'FROM ai-index-idx-* METADATA _id, _index',
        LIFECYCLE,
        '| WHERE type IS NOT NULL',
        '| STATS count = COUNT(*) BY type',
        '| SORT count DESC, type ASC',
        `| LIMIT ${MAX_AI_INDEX_DESCRIBE_TYPE_COUNTS}`,
      ].join('\n'),
      filter: buildAiIndexSpaceFilter('team-a'),
      allow_partial_results: false,
    });
    expect(esqlQuery).toHaveBeenCalledWith({
      query: [
        'FROM ai-index-idx-* METADATA _id, _index',
        LIFECYCLE,
        '| MV_EXPAND tags',
        '| WHERE tags IS NOT NULL',
        '| STATS count = COUNT(*) BY tags',
        '| SORT count DESC, tags ASC',
        `| LIMIT ${MAX_AI_INDEX_DESCRIBE_TAG_COUNTS}`,
      ].join('\n'),
      filter: buildAiIndexSpaceFilter('team-a'),
      allow_partial_results: false,
    });
    for (const query of queries()) {
      expect(Parser.parse(query).errors).toEqual([]);
    }
  });

  it('collapses a data stream to the newest revision before counting', async () => {
    await describeAiIndexAggregations({
      ...params,
      dest: { type: 'data_stream', value: 'ai-index-ds-a' },
      fields: [field('type', true)],
    });

    const [query] = queries();
    expect(query).toContain('| INLINE STATS latest = MAX(@timestamp) BY id\n');
    expect(query.indexOf('INLINE STATS')).toBeLessThan(query.indexOf('governance.lifecycle'));
    expect(Parser.parse(query).errors).toEqual([]);
  });

  it('only counts the fields that are aggregatable', async () => {
    await describeAiIndexAggregations({
      ...params,
      fields: [field('type', false), field('tags', true)],
    });

    expect(queries()).toHaveLength(1);
    expect(queries()[0]).toContain('BY tags');
  });

  it('maps rows to counts by column name', async () => {
    esqlQuery.mockResolvedValueOnce({
      columns: [{ name: 'count' }, { name: 'type' }],
      values: [
        [7, 'document'],
        [2, 'detection'],
      ],
    });
    esqlQuery.mockResolvedValueOnce({
      columns: [{ name: 'count' }, { name: 'tags' }],
      values: [[3, 'billing']],
    });

    const result = await describeAiIndexAggregations({
      ...params,
      fields: [field('type', true), field('tags', true)],
    });

    expect(result).toEqual({
      kiTypeCounts: [
        { type: 'document', count: 7 },
        { type: 'detection', count: 2 },
      ],
      tagCounts: [{ tag: 'billing', count: 3 }],
    });
  });

  it('rethrows Elasticsearch errors', async () => {
    esqlQuery.mockRejectedValue(esResponseError(500, 'search_phase_execution_exception'));

    await expect(
      describeAiIndexAggregations({ ...params, fields: [field('type', true)] })
    ).rejects.toThrow('search_phase_execution_exception');
  });
});
