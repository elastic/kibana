/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { describeAiIndex } from './describe';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { describeAiIndexQueryTemplates } from './describe_templates';
import { buildSuggestedQueries } from './suggested_queries';

jest.mock('./describe_fields');
jest.mock('./describe_aggregations');
jest.mock('./describe_templates');
jest.mock('./suggested_queries');

const describeAiIndexFieldsMock = jest.mocked(describeAiIndexFields);
const describeAiIndexAggregationsMock = jest.mocked(describeAiIndexAggregations);
const describeAiIndexQueryTemplatesMock = jest.mocked(describeAiIndexQueryTemplates);
const buildSuggestedQueriesMock = jest.mocked(buildSuggestedQueries);

const aiIndex: AiIndexHttpItem = {
  id: 'support',
  description: 'Support KIs',
  dest: { type: 'index', value: 'ai-index-idx-support*' },
  managed: false,
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const fields = [
  { path: 'title', type: 'text', searchable: true, aggregatable: false },
  { path: 'type', type: 'keyword', searchable: true, aggregatable: true },
];
const template = { ki_id: 'ki-1', title: 'Errors', esql: 'FROM logs-* | LIMIT 5' };

describe('describeAiIndex', () => {
  const esClient = {} as ElasticsearchClient;
  const spaceId = 'team-a';

  beforeEach(() => {
    jest.resetAllMocks();
    describeAiIndexFieldsMock.mockResolvedValue({
      fields,
      semantic_fields: ['content.semantic'],
      truncated: true,
    });
    describeAiIndexAggregationsMock.mockResolvedValue({
      ki_type_counts: [
        { type: 'document', count: 7 },
        { type: 'detection', count: 2 },
      ],
      tag_counts: [{ tag: 'billing', count: 3 }],
    });
    describeAiIndexQueryTemplatesMock.mockResolvedValue({
      query_templates: [template],
      truncated: true,
    });
    buildSuggestedQueriesMock.mockReturnValue({ keyword_search: 'FROM x | LIMIT 10' });
  });

  it('combines registry data, field metadata, aggregations, templates and suggestions', async () => {
    const result = await describeAiIndex({ esClient, aiIndex, spaceId });

    expect(describeAiIndexFieldsMock).toHaveBeenCalledWith({
      esClient,
      target: 'ai-index-idx-support*',
    });
    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith({
      esClient,
      target: 'ai-index-idx-support*',
      spaceId,
      fields,
    });
    expect(describeAiIndexQueryTemplatesMock).toHaveBeenCalledWith({
      esClient,
      target: 'ai-index-idx-support*',
      spaceId,
      fields,
    });
    expect(buildSuggestedQueriesMock).toHaveBeenCalledWith({
      target: 'ai-index-idx-support*',
      fields,
      semanticFields: ['content.semantic'],
      topType: 'document',
    });
    expect(result).toEqual({
      id: 'support',
      esql_target: 'ai-index-idx-support*',
      description: 'Support KIs',
      dest: { type: 'index', value: 'ai-index-idx-support*' },
      managed: false,
      fields,
      semantic_fields: ['content.semantic'],
      ki_type_counts: [
        { type: 'document', count: 7 },
        { type: 'detection', count: 2 },
      ],
      tag_counts: [{ tag: 'billing', count: 3 }],
      query_templates: [template],
      suggested_queries: { keyword_search: 'FROM x | LIMIT 10' },
      truncated: { fields: true, query_templates: true },
    });
  });

  it('passes no topType when there are no type counts', async () => {
    describeAiIndexAggregationsMock.mockResolvedValue({ ki_type_counts: [], tag_counts: [] });

    await describeAiIndex({ esClient, aiIndex, spaceId });

    expect(buildSuggestedQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ topType: undefined })
    );
  });

  it('omits description when the AI index has none', async () => {
    const { description, ...withoutDescription } = aiIndex;

    const result = await describeAiIndex({ esClient, aiIndex: withoutDescription, spaceId });

    expect(result).not.toHaveProperty('description');
  });
});
