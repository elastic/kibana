/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { describeAiIndex } from './describe';
import { describeAiIndexFields } from './describe_fields';

jest.mock('./describe_fields');

const describeAiIndexFieldsMock = jest.mocked(describeAiIndexFields);

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

describe('describeAiIndex', () => {
  const esClient = {} as ElasticsearchClient;

  beforeEach(() => {
    describeAiIndexFieldsMock.mockReset();
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [{ path: 'title', type: 'text', searchable: true, aggregatable: false }],
      semantic_fields: [],
      truncated: true,
    });
  });

  it('describes the destination and combines registry data with field metadata', async () => {
    const result = await describeAiIndex({ esClient, aiIndex });

    expect(describeAiIndexFieldsMock).toHaveBeenCalledWith({
      esClient,
      target: 'ai-index-idx-support*',
    });
    expect(result).toEqual({
      id: 'support',
      esql_target: 'ai-index-idx-support*',
      description: 'Support KIs',
      dest: { type: 'index', value: 'ai-index-idx-support*' },
      managed: false,
      fields: [{ path: 'title', type: 'text', searchable: true, aggregatable: false }],
      semantic_fields: [],
      ki_type_counts: [],
      tag_counts: [],
      query_templates: [],
      suggested_queries: {},
      truncated: { fields: true, query_templates: false },
    });
  });

  it('omits description when the AI index has none', async () => {
    const { description, ...withoutDescription } = aiIndex;

    const result = await describeAiIndex({ esClient, aiIndex: withoutDescription });

    expect(result).not.toHaveProperty('description');
  });
});
