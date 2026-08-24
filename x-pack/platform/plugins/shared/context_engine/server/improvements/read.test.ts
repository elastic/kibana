/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ImprovementEnvelope } from '../../common/http_api/improvements';
import { OPEN_IMPROVEMENT_STATUSES } from '../../common/http_api/improvements';
import { getImprovementById, getImprovementHistory, getImprovements } from './read';

const makeImprovement = (overrides: Partial<ImprovementEnvelope> = {}): ImprovementEnvelope => ({
  improvement_id: 'imp-1',
  ai_index_id: 'support',
  status: 'proposed',
  action: 'add_ki',
  title: 'Add a KI for refund policy questions',
  rationale: 'Six retrievals for refund questions returned no rows.',
  payload: { ki: { title: 'Refund policy', content: 'Refunds are issued within 30 days.' } },
  suggested_at: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('getImprovements', () => {
  it("reads the requested space's index leniently, newest first and paginated", async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const improvement = makeImprovement();
    esClient.search.mockResolvedValue({
      hits: { total: { value: 3 }, hits: [{ _source: improvement }] },
    } as any);

    const result = await getImprovements(esClient, {
      spaceId: 'marketing',
      aiIndexId: 'support',
      from: 0,
      size: 25,
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.contextengine-improvements-marketing',
        from: 0,
        size: 25,
        ignore_unavailable: true,
        allow_no_indices: true,
        track_total_hits: true,
        query: { bool: { filter: [{ term: { ai_index_id: 'support' } }] } },
        sort: [{ suggested_at: { order: 'desc' } }],
      })
    );
    expect(result).toEqual({ improvements: [improvement], total: 3 });
  });

  it('filters by status so the review UI can hide resolved suggestions', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } } as any);

    await getImprovements(esClient, {
      spaceId: 'default',
      aiIndexId: 'support',
      statuses: OPEN_IMPROVEMENT_STATUSES,
      from: 0,
      size: 25,
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              { term: { ai_index_id: 'support' } },
              { terms: { status: ['proposed', 'failed'] } },
            ],
          },
        },
      })
    );
  });

  it('drops hits without a _source and falls back to the hit count when total is absent', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const improvement = makeImprovement();
    esClient.search.mockResolvedValue({ hits: { hits: [{ _source: improvement }, {}] } } as any);

    const result = await getImprovements(esClient, {
      spaceId: 'default',
      aiIndexId: 'support',
      from: 0,
      size: 25,
    });

    expect(result).toEqual({ improvements: [improvement], total: 1 });
  });
});

describe('getImprovementHistory', () => {
  it('returns every status, so the agent sees what was already rejected or applied', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const proposed = makeImprovement();
    const rejected = makeImprovement({ improvement_id: 'imp-0', status: 'rejected' });
    esClient.search.mockResolvedValue({
      hits: { hits: [{ _source: proposed }, { _source: rejected }] },
    } as any);

    const result = await getImprovementHistory(esClient, {
      spaceId: 'default',
      aiIndexId: 'support',
      size: 200,
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 200,
        track_total_hits: false,
        query: { bool: { filter: [{ term: { ai_index_id: 'support' } }] } },
        sort: [{ suggested_at: { order: 'desc' } }],
      })
    );
    expect(result).toEqual([proposed, rejected]);
  });

  it('returns an empty history when the space has no improvements index yet', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

    await expect(
      getImprovementHistory(esClient, { spaceId: 'default', aiIndexId: 'support', size: 200 })
    ).resolves.toEqual([]);
  });
});

describe('getImprovementById', () => {
  it('looks the improvement up by id within the space', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const improvement = makeImprovement();
    esClient.search.mockResolvedValue({ hits: { hits: [{ _source: improvement }] } } as any);

    const result = await getImprovementById(esClient, {
      spaceId: 'default',
      improvementId: 'imp-1',
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.contextengine-improvements-default',
        size: 1,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: { bool: { filter: [{ term: { improvement_id: 'imp-1' } }] } },
      })
    );
    expect(result).toEqual(improvement);
  });

  it('returns undefined when no improvement with that id exists in the space', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as any);

    await expect(
      getImprovementById(esClient, { spaceId: 'default', improvementId: 'missing' })
    ).resolves.toBeUndefined();
  });
});
