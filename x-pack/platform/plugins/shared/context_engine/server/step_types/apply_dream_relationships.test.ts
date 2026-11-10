/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { relationshipId, relationshipKey } from '../dreaming/ids';
import { getApplyDreamRelationshipsStepDefinition } from './apply_dream_relationships';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

const dreaming = {
  enabled: true,
  entities: { nodes: [{ type: 'customer' }, { type: 'city' }] },
  relationships: [{ type: 'lives_in', description: 'A customer lives in a city.' }],
};

const dest = { type: 'index' as const, value: 'ai-index-idx-support' };

const customer = {
  id: 'entity-customer--customer-825464',
  type: 'entity.customer',
  title: 'Customer 825464',
  references: [{ uri: 'ki://mem-1', relation: 'derived_from' }],
};

const montreal = {
  id: 'entity-city--montreal',
  type: 'entity.city',
  title: 'Montreal',
  references: [{ uri: 'ki://mem-1', relation: 'derived_from' }],
};

const memory = {
  id: 'mem-1',
  type: 'memory.session',
  updated_at: '2026-11-02T18:40:12.000Z',
  title: 'Moved to Montreal',
};

const livesIn = { from: customer.id, relation: 'lives_in', to: montreal.id };
const livesInId = relationshipId(relationshipKey(customer.id, 'lives_in', montreal.id));

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
  indices: { refresh: jest.fn(async () => ({})) },
  esql: { query: jest.fn() },
});

describe('getApplyDreamRelationshipsStepDefinition', () => {
  const definition = (aiIndexService: Partial<AiIndexService>, checkWritePrivilege = true) =>
    getApplyDreamRelationshipsStepDefinition({
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

  it('writes the relationships between stored facts and entities, and rejects the rest', async () => {
    const stored: Record<string, Record<string, unknown>> = {
      [customer.id]: customer,
      [montreal.id]: montreal,
      [memory.id]: memory,
    };
    const esClient = createEsClient(stored);
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [memory],
        changes: {
          relationships: [
            { ...livesIn, description: 'The customer moved to Montreal.' },
            { from: customer.id, relation: 'lives_in', to: memory.id, description: 'D' },
          ],
        },
      },
      esClient,
    });

    const { output } = await definition(aiIndexService()).handler(context);

    expect(output).toEqual({
      created: 1,
      updated: 0,
      deleted: 0,
      rejected: [
        {
          item: `relationship ${customer.id} lives_in ${memory.id}`,
          reason: `'${memory.id}' is not an existing fact or entity`,
        },
      ],
    });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.not.objectContaining({ refresh: expect.anything() }),
      expect.anything()
    );
    expect(esClient.indices.refresh).toHaveBeenCalledTimes(1);
    expect(esClient.indices.refresh).toHaveBeenCalledWith(
      { index: dest.value, ignore_unavailable: true },
      expect.anything()
    );
    expect(stored[livesInId]).toEqual(
      expect.objectContaining({
        type: 'memory.relationship',
        title: 'Customer 825464 lives in Montreal',
        description: 'The customer moved to Montreal.',
        attributes: {
          'relationship.relation': 'lives_in',
          'memory.key': `${customer.id}|lives_in|${montreal.id}`,
        },
        references: [
          { uri: `ki://${customer.id}`, relation: 'relates_to', description: 'from' },
          { uri: `ki://${montreal.id}`, relation: 'relates_to', description: 'to' },
          { uri: 'ki://mem-1', relation: 'derived_from' },
        ],
      })
    );
  });

  it('on a dry run, links the documents the batch would write and writes nothing', async () => {
    const stored: Record<string, Record<string, unknown>> = { [customer.id]: customer };
    const esClient = createEsClient(stored);
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [memory],
        changes: { relationships: [{ ...livesIn, description: 'Moved.' }] },
        documents: [montreal],
        dry_run: true,
      },
      esClient,
    });

    const { output } = await definition(aiIndexService()).handler(context);

    expect(esClient.index).not.toHaveBeenCalled();
    expect(esClient.indices.refresh).not.toHaveBeenCalled();
    expect(output).toEqual(
      expect.objectContaining({
        created: 1,
        rejected: [],
        would_write: [
          {
            id: livesInId,
            change: 'created',
            type: 'memory.relationship',
            title: 'Customer 825464 lives in Montreal',
          },
        ],
      })
    );
  });

  it('ignores planned documents on a real run', async () => {
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [memory],
        changes: { relationships: [{ ...livesIn, description: 'Moved.' }] },
        documents: [customer, montreal],
      },
      esClient: createEsClient({}),
    });

    const { output } = await definition(aiIndexService()).handler(context);

    expect(output).toEqual(expect.objectContaining({ created: 0 }));
    expect(output?.rejected).toHaveLength(1);
  });

  it('fails on relationships that do not match the schema', async () => {
    const context = createMockStepContext({
      input: { ai_index_id: 'support', memories: [], changes: { relationships: 'nope' } },
      esClient: createEsClient({}),
    });

    await expect(definition(aiIndexService()).handler(context)).rejects.toThrow(
      'The dreaming model returned invalid relationships'
    );
  });

  it('fails when the memories do not all have the same permissions, before writing anything', async () => {
    const esClient = createEsClient({});
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        memories: [
          memory,
          {
            ...memory,
            id: 'mem-2',
            permissions: {
              kibana: {
                privileges: [{ space: 'default', name: ['ai_index:support/read'], count: 1 }],
              },
            },
          },
        ],
        changes: { relationships: [{ ...livesIn, description: 'Moved.' }] },
      },
      esClient,
    });

    await expect(definition(aiIndexService()).handler(context)).rejects.toThrow(
      "The memories don't all have the same permissions"
    );
    expect(esClient.index).not.toHaveBeenCalled();
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
      input: {
        ai_index_id: 'support',
        memories: [memory],
        changes: { relationships: [{ ...livesIn, description: 'Moved.' }] },
      },
      esClient,
    });

    await expect(definition(aiIndexService(), false).handler(context)).rejects.toThrow(
      'Insufficient privileges'
    );
    expect(esClient.index).not.toHaveBeenCalled();
  });
});
