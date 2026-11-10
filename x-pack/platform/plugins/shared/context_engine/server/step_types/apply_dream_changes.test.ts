/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { getApplyDreamChangesStepDefinition } from './apply_dream_changes';
import { createMockStepContext, mockKiStepTelemetry, mockKiWriter } from './test_utils';

const dreaming = {
  enabled: true,
  facts: [{ type: 'preference' }],
  entities: { nodes: [{ type: 'customer', attributes: ['tier'] }, { type: 'city' }] },
};

const dest = { type: 'index' as const, value: 'ai-index-idx-support' };

const existingCustomer = {
  id: 'entity-customer--customer-825464',
  type: 'entity.customer',
  title: 'Customer 825464',
  content: 'Nova member.',
  attributes: { tier: 'Nova', 'memory.number_of_occurrences': 1 },
  references: [{ uri: 'ki://mem-1', relation: 'derived_from' }],
};

const changes = {
  entities: [
    {
      ref: existingCustomer.id,
      content: 'Nova member in Montreal. Prefers early morning departures.',
      source_memory_ids: ['mem-2'],
    },
    { ref: 'new:1', type: 'city', title: 'Montreal', source_memory_ids: ['mem-2'] },
  ],
  facts: [
    {
      ref: 'new:2',
      type: 'preference',
      title: 'Customer 825464 prefers early morning departures',
      content: 'Customer 825464 (Nova, Montreal) prefers early morning departures.',
      source_memory_ids: ['mem-2'],
    },
    { ref: 'new:3', type: 'complaint', title: 'X', content: 'Y', source_memory_ids: ['mem-2'] },
  ],
};

const createEsClient = (stored: Record<string, Record<string, unknown>>) => ({
  search: jest.fn(async ({ query }: { query: { term?: { id?: string } } }) => {
    const kiId = JSON.stringify(query).match(/"id":"([^"]+)"/)?.[1];
    const source = kiId ? stored[kiId] : undefined;
    return {
      hits: {
        hits: source
          ? [{ _index: dest.value, _id: kiId, _seq_no: 1, _primary_term: 1, _source: source }]
          : [],
      },
    };
  }),
  index: jest.fn(async ({ id, document }: { id: string; document: Record<string, unknown> }) => {
    stored[id] = document;
    return { _id: id };
  }),
  esql: { query: jest.fn() },
});

describe('getApplyDreamChangesStepDefinition', () => {
  const definition = (aiIndexService: Partial<AiIndexService>, checkWritePrivilege = true) =>
    getApplyDreamChangesStepDefinition({
      getAiIndexService: () => aiIndexService as AiIndexService,
      isContextEngineEnabled: async () => true,
      checkWritePrivilege: async () => checkWritePrivilege,
      ...mockKiStepTelemetry(),
    });

  const aiIndexService = (overrides: Record<string, unknown> = {}) => ({
    get: jest
      .fn()
      .mockResolvedValue({ id: 'support', dest, managed: false, dreaming, ...overrides }),
  });

  it('applies the valid items, rejects the rest, and reports what it did', async () => {
    const stored: Record<string, Record<string, unknown>> = {
      [existingCustomer.id]: existingCustomer,
    };
    const esClient = createEsClient(stored);
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [
          { id: 'mem-2', updated_at: '2026-11-02T18:40:12.000Z', title: 'Prefers mornings' },
        ],
        changes,
      },
      esClient,
    });

    const { output } = await definition(aiIndexService()).handler(context);

    expect(output).toEqual({
      created: 2,
      updated: 1,
      deleted: 0,
      rejected: [{ item: 'fact new:3', reason: "fact type 'complaint' is not configured" }],
      dropped_access_patterns: 0,
    });
    expect(stored['entity-city--montreal']).toEqual(
      expect.objectContaining({ type: 'entity.city', title: 'Montreal' })
    );
    expect(stored[existingCustomer.id]).toEqual(
      expect.objectContaining({
        content: 'Nova member in Montreal. Prefers early morning departures.',
        attributes: {
          tier: 'Nova',
          'memory.number_of_occurrences': 2,
          'memory.last_seen_at': '2026-11-02T18:40:12.000Z',
        },
        references: [
          { uri: 'ki://mem-1', relation: 'derived_from' },
          { uri: 'ki://mem-2', relation: 'derived_from' },
        ],
        governance: expect.objectContaining({
          provenance: { created_by: mockKiWriter, updated_by: mockKiWriter },
        }),
      })
    );
    const fact = Object.values(stored).find(({ type }) => type === 'fact.preference');
    expect(fact).toEqual(
      expect.objectContaining({ references: [{ uri: 'ki://mem-2', relation: 'derived_from' }] })
    );
  });

  it('keeps what it writes as restricted as the memories it came from, and ignores KIs this space cannot see', async () => {
    const permissions = {
      kibana: { privileges: [{ space: 'default', name: ['ai_index:support/read'], count: 1 }] },
    };
    const stored: Record<string, Record<string, unknown>> = {
      [existingCustomer.id]: {
        ...existingCustomer,
        permissions: { kibana: { privileges: [{ space: 'team-b', name: [], count: 0 }] } },
      },
    };
    const esClient = createEsClient(stored);
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [
          {
            id: 'mem-2',
            updated_at: '2026-11-02T18:40:12.000Z',
            title: 'Prefers mornings',
            permissions,
          },
        ],
        changes,
      },
      esClient,
    });

    const { output } = await definition(aiIndexService()).handler(context);

    expect(output).toEqual(expect.objectContaining({ created: 2, updated: 0 }));
    expect(stored['entity-city--montreal']).toEqual(expect.objectContaining({ permissions }));
    expect(stored[existingCustomer.id]).not.toEqual(
      expect.objectContaining({ content: changes.entities[0].content })
    );
  });

  it('on a dry run, reports what it would write and writes nothing', async () => {
    const stored: Record<string, Record<string, unknown>> = {
      [existingCustomer.id]: existingCustomer,
    };
    const esClient = createEsClient(stored);
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [
          { id: 'mem-2', updated_at: '2026-11-02T18:40:12.000Z', title: 'Prefers mornings' },
        ],
        changes,
        dry_run: true,
      },
      esClient,
    });

    const { output } = await definition(aiIndexService()).handler(context);

    expect(esClient.index).not.toHaveBeenCalled();
    expect(stored).toEqual({ [existingCustomer.id]: existingCustomer });
    expect(output).toEqual(
      expect.objectContaining({
        created: 2,
        updated: 1,
        deleted: 0,
        rejected: [{ item: 'fact new:3', reason: "fact type 'complaint' is not configured" }],
      })
    );
    expect(output?.would_write).toEqual([
      {
        id: existingCustomer.id,
        change: 'updated',
        type: existingCustomer.type,
        title: existingCustomer.title,
      },
      { id: 'entity-city--montreal', change: 'created', type: 'entity.city', title: 'Montreal' },
      {
        id: expect.stringMatching(/^fact-/),
        change: 'created',
        type: expect.stringMatching(/^fact\./),
        title: expect.any(String),
      },
    ]);
    expect(output?.documents?.map(({ id }) => id)).toEqual(
      output?.would_write?.map(({ id }) => id)
    );
    expect(output?.documents?.[0]).toEqual(
      expect.objectContaining({
        references: [
          { uri: 'ki://mem-1', relation: 'derived_from' },
          { uri: 'ki://mem-2', relation: 'derived_from' },
        ],
      })
    );
  });

  it('writes nothing from a memory whose latest revision is a tombstone', async () => {
    const stored: Record<string, Record<string, unknown>> = {};
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [
          {
            id: 'mem-9',
            updated_at: '2026-11-02T18:40:12.000Z',
            governance: { lifecycle: { status: 'deleted' } },
          },
        ],
        changes: {
          entities: [{ ref: 'new:1', type: 'city', title: 'Lyon', source_memory_ids: ['mem-9'] }],
        },
      },
      esClient: createEsClient(stored),
    });

    const { output } = await definition(aiIndexService()).handler(context);

    expect(output).toEqual(
      expect.objectContaining({
        created: 0,
        rejected: [{ item: 'entity new:1', reason: 'cites memories it was not shown: mem-9' }],
      })
    );
    expect(stored).toEqual({});
  });

  it('fails on a change set that does not match the schema', async () => {
    const context = createMockStepContext({
      input: { ai_index_id: 'support', memories: [], changes: { entities: 'nope' } },
      esClient: createEsClient({}),
    });

    await expect(definition(aiIndexService()).handler(context)).rejects.toThrow(
      'The dreaming model returned an invalid change set'
    );
  });

  it('fails when the AI index has no dreaming config, or does not exist', async () => {
    const context = createMockStepContext({
      input: { ai_index_id: 'support', memories: [], changes: {} },
      esClient: createEsClient({}),
    });

    await expect(
      definition(aiIndexService({ dreaming: undefined })).handler(context)
    ).rejects.toThrow("AI index 'support' has no dreaming config");
    await expect(
      definition({ get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('support')) }).handler(
        context
      )
    ).rejects.toThrow(
      new ExecutionError({ type: 'NotFoundError', message: "AI index 'support' not found" })
    );
  });

  it('fails without the Context Engine write privilege, before writing anything', async () => {
    const esClient = createEsClient({});
    const context = createMockStepContext({
      input: { ai_index_id: 'support', memories: [], changes },
      esClient,
    });

    await expect(definition(aiIndexService(), false).handler(context)).rejects.toThrow(
      'Insufficient privileges'
    );
    expect(esClient.index).not.toHaveBeenCalled();
  });
});
