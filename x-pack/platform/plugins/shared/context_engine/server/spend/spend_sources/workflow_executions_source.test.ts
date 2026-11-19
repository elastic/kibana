/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createWorkflowExecutionsSpendSource } from './workflow_executions_source';

const sum = (value: number | null) => ({ value });

const query = {
  spaceId: 'default',
  from: new Date('2026-10-01T00:00:00.000Z'),
  to: new Date('2026-11-01T00:00:00.000Z'),
  aiIndices: [
    { id: 'tickets', automationWorkflowIds: ['wf-tickets'] },
    { id: 'docs', automationWorkflowIds: ['wf-docs-a', 'wf-docs-b'] },
    { id: 'empty', automationWorkflowIds: [] },
  ],
};

describe('createWorkflowExecutionsSpendSource', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const source = createWorkflowExecutionsSpendSource({ getEsClient: () => esClient });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries the executions of attached workflows in the space and period', async () => {
    esClient.search.mockResolvedValue({ aggregations: { by_workflow: { buckets: [] } } } as never);

    await source.getUsage(query);

    const [request] = esClient.search.mock.calls[0] as unknown as [
      { index: string; query: { bool: { filter: unknown[] } } }
    ];
    expect(request.index).toBe('.workflows-executions');
    expect(request.query.bool.filter).toEqual([
      { term: { spaceId: 'default' } },
      { terms: { workflowId: ['wf-tickets', 'wf-docs-a', 'wf-docs-b'] } },
      {
        range: {
          createdAt: { gte: '2026-10-01T00:00:00.000Z', lt: '2026-11-01T00:00:00.000Z' },
        },
      },
    ]);
  });

  it('attributes per-connector step usage to the owning AI index', async () => {
    esClient.search.mockResolvedValue({
      aggregations: {
        by_workflow: {
          buckets: [
            {
              key: 'wf-docs-b',
              input: sum(1500),
              output: sum(300),
              cached: sum(100),
              steps: {
                by_connector: {
                  buckets: [
                    {
                      key: '.anthropic-claude-4.5-haiku-chat_completion',
                      input: sum(1000),
                      output: sum(200),
                      cached: sum(100),
                    },
                    { key: '__unknown__', input: sum(500), output: sum(100), cached: sum(null) },
                  ],
                },
              },
            },
          ],
        },
      },
    } as never);

    await expect(source.getUsage(query)).resolves.toEqual([
      {
        aiIndexId: 'docs',
        connectorId: '.anthropic-claude-4.5-haiku-chat_completion',
        inputTokens: 1000,
        outputTokens: 200,
        cachedTokens: 100,
      },
      { aiIndexId: 'docs', inputTokens: 500, outputTokens: 100, cachedTokens: 0 },
    ]);
  });

  it('keeps execution usage that no step itemized as unpriced', async () => {
    esClient.search.mockResolvedValue({
      aggregations: {
        by_workflow: {
          buckets: [
            {
              key: 'wf-tickets',
              input: sum(800),
              output: sum(80),
              cached: sum(0),
              steps: { by_connector: { buckets: [] } },
            },
          ],
        },
      },
    } as never);

    await expect(source.getUsage(query)).resolves.toEqual([
      { aiIndexId: 'tickets', inputTokens: 800, outputTokens: 80, cachedTokens: 0 },
    ]);
  });

  it('skips the query when no AI index has automations', async () => {
    await expect(
      source.getUsage({ ...query, aiIndices: [{ id: 'empty', automationWorkflowIds: [] }] })
    ).resolves.toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('reports no usage before the executions index exists', async () => {
    esClient.search.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 404,
        body: {},
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    await expect(source.getUsage(query)).resolves.toEqual([]);
  });
});
