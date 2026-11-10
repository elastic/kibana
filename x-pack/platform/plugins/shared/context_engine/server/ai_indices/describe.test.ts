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
  ...buildExampleQueries(aiIndex.dest, { excludeMemory: true, dreams: true }).flatMap(
    ({ title, esql }) => ['', title, esql]
  ),
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
      dreamedTypeCounts: [],
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
      dreams: false,
      dreamedTypes: [],
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
    describeAiIndexAggregationsMock.mockResolvedValue({
      kiTypeCounts: [],
      tagCounts: [],
      dreamedTypeCounts: [],
    });

    const response = await describeAiIndex(params);

    expect(response).toContain('\n\nFields\n(none)\n\n');
    expect(response).not.toContain('Knowledge item types');
    expect(response).not.toContain('\nTags\n');
    expect(response.endsWith(exampleQueriesBlock)).toBe(true);
  });

  it('renders memory capability without treating document counts as logical memory counts', async () => {
    describeAiIndexAggregationsMock.mockResolvedValue({
      kiTypeCounts: [
        { type: 'memory.session', count: 2 },
        { type: 'memory.session_fact', count: 7 },
        { type: 'fact.preference', count: 4 },
        { type: 'entity.customer', count: 1 },
        { type: 'document', count: 3 },
      ],
      tagCounts: [],
      dreamedTypeCounts: [],
    });

    const response = await describeAiIndex({
      ...params,
      aiIndex: { ...aiIndex, dreaming: { enabled: true, facts: [{ type: 'preference' }] } },
      includeMemory: true,
    });

    expect(response).toContain(
      '\nMemory\nThis AI index takes memories: dreaming is set up for it.'
    );
    expect(response).toContain('\nKnowledge item types\n"document": 3\n');
    expect(response).not.toContain('"memory.session": 2');
    expect(response).not.toContain('"memory.session_fact": 7');
    expect(response).not.toContain('"entity.customer"');
    expect(response).toContain(
      [
        'Unless the task specifically calls for memory, exclude memory types, and the facts, entities and procedures dreaming writes, from ordinary KI retrieval:',
        '| WHERE type IS NULL OR (type != "memory.session" AND type != "memory.session_fact" AND NOT type LIKE "fact.*" AND NOT type LIKE "entity.*" AND NOT type LIKE "procedure.*")',
      ].join('\n')
    );
    expect(response).toContain(
      [
        'For cross-session recall, search session facts and long-term facts together with hybrid retrieval, so memories dreaming has not reached yet are found too:',
        'FROM ai-index-idx-support* METADATA _id, _index, _score',
        '| WHERE type == "memory.session_fact" OR type LIKE "fact.*"',
        '| INLINE STATS latest_at = MAX(@timestamp) BY id',
        '| WHERE @timestamp == latest_at',
        '  AND (governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active")',
        '  AND (expires_at IS NULL OR expires_at > NOW())',
        '| FORK',
      ].join('\n')
    );
    expect(response).toContain('| FUSE\n| SORT _score DESC, _id ASC');
    expect(response).not.toContain('For recall from the current Agent Builder conversation:');
    expect(response).toContain('references.uri, references.relation, references.description');
    expect(response).toContain(
      'Select the latest revision before filtering deleted or expired memories'
    );
    expect(response.endsWith(memoryAwareExampleQueriesBlock)).toBe(true);
  });

  it('lists the configured fact types with their descriptions and counts, and how to read facts', async () => {
    describeAiIndexAggregationsMock.mockResolvedValue({
      kiTypeCounts: [],
      tagCounts: [],
      dreamedTypeCounts: [{ type: 'fact.known_issue', count: 3 }],
    });

    const response = await describeAiIndex({
      ...params,
      aiIndex: {
        ...aiIndex,
        dreaming: {
          enabled: true,
          facts: [
            { type: 'known_issue', description: 'A problem confirmed to affect customers' },
            { type: 'policy' },
          ],
        },
      },
      includeMemory: true,
    });

    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dreams: true, dreamedTypes: ['fact.known_issue', 'fact.policy'] })
    );
    expect(response).toContain(
      [
        'Dreaming turns memories into long-term facts, each typed fact.<fact type> and written to stand on its own. Fact types, with how many facts each has:',
        '"fact.known_issue": 3 - A problem confirmed to affect customers',
        '"fact.policy": 0',
        'Facts of one type, newest first:',
        'FROM ai-index-idx-support* METADATA _id',
        '| WHERE type == "fact.<fact type>"',
      ].join('\n')
    );
    expect(response).toContain(
      [
        'The most recent facts:',
        'FROM ai-index-idx-support* METADATA _id',
        '| WHERE type LIKE "fact.*"',
      ].join('\n')
    );
  });

  it('leaves facts out of the memory section when no fact types are configured', async () => {
    const response = await describeAiIndex({
      ...params,
      aiIndex: {
        ...aiIndex,
        dreaming: { enabled: true, entities: { nodes: [{ type: 'customer' }] } },
      },
      includeMemory: true,
    });

    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dreams: true, dreamedTypes: ['entity.customer'] })
    );
    expect(response).toContain('\nMemory\n');
    expect(response).not.toContain('Fact types');
    expect(response).not.toContain('type LIKE "fact.*"\n');
    expect(response).toContain(
      'For cross-session recall, search granular facts with hybrid retrieval:\nFROM ai-index-idx-support* METADATA _id, _index, _score\n| WHERE type == "memory.session_fact"\n'
    );
  });

  it('lists the configured entity types with their counts and attributes, and how to find an entity', async () => {
    describeAiIndexAggregationsMock.mockResolvedValue({
      kiTypeCounts: [],
      tagCounts: [],
      dreamedTypeCounts: [{ type: 'entity.customer', count: 2 }],
    });

    const response = await describeAiIndex({
      ...params,
      aiIndex: {
        ...aiIndex,
        dreaming: {
          enabled: true,
          entities: {
            nodes: [
              { type: 'customer', description: 'A paying account', attributes: ['plan', 'region'] },
              { type: 'service' },
            ],
          },
        },
      },
      includeMemory: true,
    });

    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dreamedTypes: ['entity.customer', 'entity.service'] })
    );
    expect(response).toContain(
      [
        'Dreaming keeps the things memories are about as entities, each typed entity.<entity type>: title holds its name, and content a summary of what is known about it, including its attribute values. Entity types, with how many entities each has:',
        '"entity.customer": 2 - A paying account (attributes: plan, region)',
        '"entity.service": 0',
        'An entity by name, across entity types:',
        'FROM ai-index-idx-support* METADATA _id, _score',
        '| WHERE type LIKE "entity.*"',
      ].join('\n')
    );
    expect(response).toContain('| WHERE title:"<name>"\n| SORT _score DESC, _id ASC\n');
    expect(response).toContain(
      'Entities of one type, newest first:\nFROM ai-index-idx-support* METADATA _id\n| WHERE type == "entity.<entity type>"\n'
    );
    expect(response).not.toContain('Procedure types');
  });

  it('lists the configured procedure types with their counts, and how to find a procedure for a task', async () => {
    describeAiIndexAggregationsMock.mockResolvedValue({
      kiTypeCounts: [],
      tagCounts: [],
      dreamedTypeCounts: [{ type: 'procedure.runbook', count: 5 }],
    });

    const response = await describeAiIndex({
      ...params,
      aiIndex: {
        ...aiIndex,
        dreaming: {
          enabled: true,
          facts: [{ type: 'policy' }],
          procedures: [{ type: 'runbook', description: 'How to resolve an incident' }],
        },
      },
      includeMemory: true,
    });

    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dreamedTypes: ['fact.policy', 'procedure.runbook'] })
    );
    expect(response).toContain(['"fact.policy": 0', 'Facts of one type, newest first:'].join('\n'));
    expect(response).toContain(
      [
        'Dreaming keeps reusable step-by-step procedures, each typed procedure.<procedure type>: title names the task, description says when to use it, and content holds the numbered steps. Procedure types, with how many procedures each has:',
        '"procedure.runbook": 5 - How to resolve an incident',
        'A procedure for a task, with hybrid retrieval:',
        'FROM ai-index-idx-support* METADATA _id, _index, _score',
        '| WHERE type LIKE "procedure.*"',
      ].join('\n')
    );
    expect(response).toContain(
      'Procedures of one type, newest first:\nFROM ai-index-idx-support* METADATA _id\n| WHERE type == "procedure.<procedure type>"\n'
    );
    expect(response).not.toContain('Entity types');
    expect(response).toContain(
      'For cross-session recall, search session facts and long-term facts together with hybrid retrieval, so memories dreaming has not reached yet are found too:\nFROM ai-index-idx-support* METADATA _id, _index, _score\n| WHERE type == "memory.session_fact" OR type LIKE "fact.*"\n'
    );
  });

  it('omits memory capability when dreaming is not set up', async () => {
    const response = await describeAiIndex(params);

    expect(response).not.toContain('\nMemory\n');
    expect(response).not.toContain('platform.context_engine.remember');
  });

  it('keeps fact and entity types in the counts and queries of an AI index that does not dream', async () => {
    describeAiIndexAggregationsMock.mockResolvedValue({
      kiTypeCounts: [
        { type: 'entity.host', count: 5 },
        { type: 'document', count: 3 },
      ],
      tagCounts: [],
      dreamedTypeCounts: [],
    });

    const response = await describeAiIndex({ ...params, includeMemory: true });

    expect(describeAiIndexAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dreams: false, dreamedTypes: [] })
    );
    expect(response).toContain('\nKnowledge item types\n"entity.host": 5\n"document": 3\n');
    expect(response).not.toContain('NOT type LIKE');
  });

  it('omits memory capability when the memory feature flag is disabled', async () => {
    const response = await describeAiIndex({
      ...params,
      aiIndex: { ...aiIndex, dreaming: { enabled: true, facts: [{ type: 'preference' }] } },
    });

    expect(response).not.toContain('\nMemory\n');
    expect(response).not.toContain('platform.context_engine.remember');
    expect(response).not.toContain('memory.session');
    expect(response.endsWith(exampleQueriesBlock)).toBe(true);
  });
});
