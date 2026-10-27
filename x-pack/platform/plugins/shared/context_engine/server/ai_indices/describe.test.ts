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
import { buildExampleQueries } from './example_queries';
import {
  LONG_TERM_MEMORY_AI_INDEX_ID,
  LONG_TERM_MEMORY_INDEX,
  SHORT_TERM_MEMORY_AI_INDEX_ID,
  SHORT_TERM_MEMORY_DATA_STREAM,
} from '../../common/memory';

jest.mock('./describe_fields');
jest.mock('./describe_aggregations');

const describeAiIndexFieldsMock = jest.mocked(describeAiIndexFields);
const describeAiIndexAggregationsMock = jest.mocked(describeAiIndexAggregations);

const aiIndex: AiIndexHttpItem = {
  id: 'support',
  description: 'Support KIs',
  dest: { type: 'index', value: 'ai-index-idx-support*' },
  managed: false,
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const fields = [
  { path: 'content.semantic', type: 'semantic_text', searchable: true, aggregatable: false },
  { path: 'title', type: 'text', searchable: true, aggregatable: false },
  { path: 'type', type: 'keyword', searchable: true, aggregatable: true },
  { path: 'weight', type: 'binary', searchable: false, aggregatable: false },
];

const exampleQueriesBlock = [
  'Example queries (adapt field names for non-canonical indices)',
  ...buildExampleQueries(aiIndex.dest).flatMap(({ title, esql }) => ['', title, esql]),
].join('\n');

const memoryAwareExampleQueriesBlock = [
  'Example queries (adapt field names for non-canonical indices)',
  ...buildExampleQueries(aiIndex.dest, { excludeMemory: true }).flatMap(({ title, esql }) => [
    '',
    title,
    esql,
  ]),
].join('\n');

describe('describeAiIndex', () => {
  const esClient = {} as ElasticsearchClient;
  const params = { esClient, aiIndex, spaceId: 'marketing', includeMemory: false };

  beforeEach(() => {
    describeAiIndexFieldsMock.mockReset();
    describeAiIndexFieldsMock.mockResolvedValue({
      fields,
      allFields: fields,
      semanticFields: ['content.semantic'],
      omittedFieldCount: 0,
    });
    describeAiIndexAggregationsMock.mockReset();
    describeAiIndexAggregationsMock.mockResolvedValue({
      kiTypeCounts: [
        { type: 'document', count: 7 },
        { type: 'detection rule', count: 2 },
      ],
      tagCounts: [{ tag: 'billing, invoices', count: 3 }],
    });
  });

  it('renders every section one item per line, keys quoted', async () => {
    const response = await describeAiIndex(params);

    expect(describeAiIndexFieldsMock).toHaveBeenCalledWith({
      esClient,
      target: 'ai-index-idx-support*',
    });
    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith({
      esClient,
      dest: aiIndex.dest,
      spaceId: 'marketing',
      fields,
      excludeMemory: true,
    });
    expect(response).toBe(
      [
        'AI-index registry ID: support',
        'Support KIs',
        'Backing Elasticsearch target (use only in ES|QL queries): ai-index-idx-support*',
        '',
        'Fields',
        'content.semantic: semantic_text, searchable',
        'title: text, searchable',
        'type: keyword, searchable, aggregatable',
        'weight: binary',
        '',
        'Semantic fields',
        'content.semantic',
        '',
        'Knowledge item types',
        '"document": 7',
        '"detection rule": 2',
        '',
        'Tags',
        '"billing, invoices": 3',
        '',
        exampleQueriesBlock,
      ].join('\n')
    );
  });

  it('omits the description line when the AI index has none', async () => {
    const { description, ...withoutDescription } = aiIndex;

    const response = await describeAiIndex({ ...params, aiIndex: withoutDescription });

    expect(response.split('\n').slice(0, 2)).toEqual([
      'AI-index registry ID: support',
      'Backing Elasticsearch target (use only in ES|QL queries): ai-index-idx-support*',
    ]);
  });

  it('reports omitted fields in the heading', async () => {
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [fields[1]],
      allFields: fields,
      semanticFields: [],
      omittedFieldCount: 3,
    });

    const response = await describeAiIndex(params);

    expect(response).toContain('\nFields (showing 1 of 4)\n');
    expect(response).not.toContain('Semantic fields');
  });

  it('gates counts on the uncapped field list, so type/tags beyond the display cap still count', async () => {
    const [content, title, type] = fields;
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [content, title],
      allFields: [content, title, type],
      semanticFields: [],
      omittedFieldCount: 1,
    });

    const response = await describeAiIndex(params);

    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ fields: [content, title, type] })
    );
    expect(response).not.toContain('\ntype: keyword');
    expect(response).toContain('\nKnowledge item types\n"document": 7\n');
  });

  it('drops empty sections but always renders the example queries', async () => {
    describeAiIndexFieldsMock.mockResolvedValue({
      fields: [],
      allFields: [],
      semanticFields: [],
      omittedFieldCount: 0,
    });
    describeAiIndexAggregationsMock.mockResolvedValue({ kiTypeCounts: [], tagCounts: [] });

    const response = await describeAiIndex(params);

    expect(response).toContain('\n\nFields\n(none)\n\n');
    expect(response).not.toContain('Knowledge item types');
    expect(response).not.toContain('\nTags\n');
    expect(response.endsWith(exampleQueriesBlock)).toBe(true);
  });

  describe('memory', () => {
    const shortTermStore: AiIndexHttpItem = {
      ...aiIndex,
      id: SHORT_TERM_MEMORY_AI_INDEX_ID,
      managed: true,
      dest: { type: 'data_stream', value: SHORT_TERM_MEMORY_DATA_STREAM },
    };
    const longTermStore: AiIndexHttpItem = {
      ...aiIndex,
      id: LONG_TERM_MEMORY_AI_INDEX_ID,
      managed: true,
      dest: { type: 'index', value: LONG_TERM_MEMORY_INDEX },
    };
    const exampleQueriesFor = ({ dest }: AiIndexHttpItem) =>
      [
        'Example queries (adapt field names for non-canonical indices)',
        ...buildExampleQueries(dest).flatMap(({ title, esql }) => ['', title, esql]),
      ].join('\n');

    beforeEach(() => {
      describeAiIndexAggregationsMock.mockResolvedValue({
        kiTypeCounts: [
          { type: 'memory.session', count: 2 },
          { type: 'memory.session_fact', count: 7 },
          { type: 'document', count: 3 },
        ],
        tagCounts: [],
      });
    });

    it('hides memory types from ordinary AI indices without a Memory section', async () => {
      const response = await describeAiIndex({ ...params, includeMemory: true });

      expect(response).not.toContain('\nMemory\n');
      expect(response).not.toContain('platform.context_engine.remember');
      expect(response).toContain('\nKnowledge item types\n"document": 3\n');
      expect(response).not.toContain('"memory.session": 2');
      expect(response.endsWith(memoryAwareExampleQueriesBlock)).toBe(true);
    });

    it('describes the short-term memory store', async () => {
      const response = await describeAiIndex({
        ...params,
        aiIndex: shortTermStore,
        includeMemory: true,
      });

      expect(response).toContain(
        [
          'Memory',
          'This is the short-term memory store for this space.',
          'Available memory types',
          'memory.session',
          'memory.session_fact',
          'Use platform.context_engine.remember to write memory.',
          'Use platform.context_engine.forget with a memory id to tombstone memory.',
          'For cross-session recall, search granular facts with hybrid retrieval:',
          `FROM ${SHORT_TERM_MEMORY_DATA_STREAM} METADATA _id, _index, _score`,
          '| WHERE type == "memory.session_fact"',
          '| INLINE STATS latest_at = MAX(@timestamp) BY id',
        ].join('\n')
      );
      expect(response).toContain(
        'Select the latest revision before filtering deleted or expired memories'
      );
      expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith(
        expect.objectContaining({ excludeMemory: false })
      );
      expect(response).toContain('"memory.session": 2');
      expect(response).toContain('"memory.session_fact": 7');
      expect(response.endsWith(exampleQueriesFor(shortTermStore))).toBe(true);
    });

    it('describes the long-term memory store as read-only memories of every long-term type', async () => {
      const response = await describeAiIndex({
        ...params,
        aiIndex: longTermStore,
        includeMemory: true,
      });

      expect(response).toContain(
        [
          'Memory',
          'This is the long-term memory store for this space. Dreaming writes it from short-term memory; agents only read it.',
          'Available memory types',
          'memory.fact: a statement about this environment that stays true.',
        ].join('\n')
      );
      expect(response).toContain('memory.entity: ');
      expect(response).toContain('memory.procedure: ');
      expect(response).toContain('memory.relationship: ');
      expect(response).toContain(
        [
          `FROM ${LONG_TERM_MEMORY_INDEX} METADATA _id, _score`,
          '| WHERE type IN ("memory.fact", "memory.entity", "memory.procedure")',
        ].join('\n')
      );
      expect(response).toContain(
        [
          `FROM ${LONG_TERM_MEMORY_INDEX}`,
          '| WHERE type == "memory.relationship"',
          '  AND references.uri == "ki://long-term-memory/<id>"',
        ].join('\n')
      );
      expect(response).not.toContain('platform.context_engine.remember');
      expect(response.endsWith(exampleQueriesFor(longTermStore))).toBe(true);
    });

    it('omits the Memory section for a user-created AI index that reuses a memory store id', async () => {
      const response = await describeAiIndex({
        ...params,
        aiIndex: { ...shortTermStore, managed: false },
        includeMemory: true,
      });

      expect(response).not.toContain('\nMemory\n');
      expect(response).not.toContain('"memory.session": 2');
    });

    it('omits memory capability when the memory feature flag is disabled', async () => {
      const response = await describeAiIndex({ ...params, aiIndex: shortTermStore });

      expect(response).not.toContain('\nMemory\n');
      expect(response).not.toContain('platform.context_engine.remember');
    });
  });
});
