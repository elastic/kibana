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
      fields: [
        { path: 'content.semantic', type: 'semantic_text', searchable: true, aggregatable: false },
        { path: 'title', type: 'text', searchable: true, aggregatable: false },
        { path: 'type', type: 'keyword', searchable: true, aggregatable: true },
        { path: 'weight', type: 'binary', searchable: false, aggregatable: false },
      ],
      semanticFields: ['content.semantic'],
      omittedFieldCount: 0,
    });
  });

  it('renders header, fields and semantic fields one item per line', async () => {
    const response = await describeAiIndex({ esClient, aiIndex });

    expect(describeAiIndexFieldsMock).toHaveBeenCalledWith({
      esClient,
      target: 'ai-index-idx-support*',
    });
    expect(response).toBe(
      [
        'AI index: support',
        'Support KIs',
        'Query with ES|QL against: ai-index-idx-support*',
        '',
        'Fields',
        'content.semantic: semantic_text, searchable',
        'title: text, searchable',
        'type: keyword, searchable, aggregatable',
        'weight: binary',
        '',
        'Semantic fields',
        'content.semantic',
      ].join('\n')
    );
  });

  it('omits the description line when the AI index has none', async () => {
    const { description, ...withoutDescription } = aiIndex;

    const response = await describeAiIndex({ esClient, aiIndex: withoutDescription });

    expect(response.split('\n').slice(0, 2)).toEqual([
      'AI index: support',
      'Query with ES|QL against: ai-index-idx-support*',
    ]);
  });

  it('reports omitted fields in the heading', async () => {
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [{ path: 'title', type: 'text', searchable: true, aggregatable: false }],
      semanticFields: [],
      omittedFieldCount: 3,
    });

    const response = await describeAiIndex({ esClient, aiIndex });

    expect(response).toContain('\nFields (showing 1 of 4)\n');
    expect(response).not.toContain('Semantic fields');
  });

  it('renders a placeholder when the target maps no fields', async () => {
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [],
      semanticFields: [],
      omittedFieldCount: 0,
    });

    const response = await describeAiIndex({ esClient, aiIndex });

    expect(response.endsWith('\n\nFields\n(none)')).toBe(true);
  });
});
