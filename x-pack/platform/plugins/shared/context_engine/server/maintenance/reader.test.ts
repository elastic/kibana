/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { MAINTENANCE_CHANGED_PAGE_SIZE } from '../../common/step_types/gather_maintenance';
import { createMaintenanceReader } from './reader';

const dest = { type: 'index' as const, value: 'ai-index-idx-a' };

const collapsedHit = (source: Record<string, unknown>) => ({
  _index: dest.value,
  _source: { id: source.id, updated_at: source.updated_at },
  inner_hits: {
    latest: { hits: { total: 1, hits: [{ _index: dest.value, _source: source }] } },
  },
});

const searchResponse = (hits: Array<ReturnType<typeof collapsedHit>>) =>
  ({ hits: { hits } } as unknown as Awaited<
    ReturnType<ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>['search']>
  >);

describe('createMaintenanceReader', () => {
  const setup = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const reader = createMaintenanceReader({ esClient, dest, spaceId: 'team-a' });
    return { esClient, reader };
  };

  it('reads changes after the cursor in this space, and resumes after a full page', async () => {
    const { esClient, reader } = setup();
    const hits = Array.from({ length: MAINTENANCE_CHANGED_PAGE_SIZE }, (_, index) =>
      collapsedHit({
        id: `fact-${String(index).padStart(3, '0')}`,
        type: 'fact.note',
        title: 'Note',
        updated_at: '2026-11-02T00:00:00.000Z',
      })
    );
    esClient.search.mockResolvedValue(searchResponse(hits));

    const page = await reader.changedSince('2026-11-01T00:00:00.000Z', 'fact-000');

    const [request] = esClient.search.mock.calls[0];
    const filters = (request as { query: { bool: { filter: unknown[] } } }).query.bool.filter;
    expect(filters).toContainEqual(buildAiIndexSpaceFilter('team-a'));
    expect(JSON.stringify(filters)).toContain('"id":{"gt":"fact-000"}');
    expect(page.kis).toHaveLength(MAINTENANCE_CHANGED_PAGE_SIZE);
    expect(page.resume).toEqual({ from: '2026-11-02T00:00:00.000Z', afterId: 'fact-299' });
  });

  it('does not resume after a partial page', async () => {
    const { esClient, reader } = setup();
    esClient.search.mockResolvedValue(
      searchResponse([collapsedHit({ id: 'fact-1', type: 'fact.note', title: 'Note' })])
    );

    expect((await reader.changedSince('2026-11-01T00:00:00.000Z', undefined)).resume).toBe(
      undefined
    );
  });

  it('finds similar items semantically, and lexically where the AI index has no semantic field', async () => {
    const { esClient, reader } = setup();
    const neighbor = collapsedHit({ id: 'fact-2', type: 'fact.note', title: 'Near' });
    esClient.msearch
      .mockResolvedValueOnce({
        took: 1,
        responses: [
          { status: 400, error: { type: 'illegal_argument_exception', reason: 'not semantic' } },
        ],
      } as never)
      .mockResolvedValueOnce({
        took: 1,
        responses: [{ hits: { hits: [neighbor] } }],
      } as never);

    const similar = await reader.similar(
      [{ id: 'fact-1', type: 'fact.note', title: 'Tom', content: 'Tom eats vegetarian.' }],
      5
    );

    const [first] = esClient.msearch.mock.calls[0];
    const [second] = esClient.msearch.mock.calls[1];
    expect(JSON.stringify(first)).toContain('"semantic":{"field":"content.semantic"');
    expect(JSON.stringify(second)).toContain('"multi_match"');
    expect(similar.get('fact-1')?.map(({ id }) => id)).toEqual(['fact-2']);
  });
});
