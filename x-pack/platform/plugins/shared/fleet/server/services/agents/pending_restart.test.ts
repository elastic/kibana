/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { getPendingRestartActions } from './pending_restart';

function searchResponse(sources: object[]) {
  return { hits: { hits: sources.map((_source) => ({ _source })) } } as any;
}

describe('getPendingRestartActions', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;

  function mockSearch({
    actions = [],
    results = [],
    cancels = [],
  }: {
    actions?: object[];
    results?: object[];
    cancels?: object[];
  }) {
    esClient.search
      .mockResolvedValueOnce(searchResponse(actions))
      .mockResolvedValueOnce(searchResponse(results))
      .mockResolvedValueOnce(searchResponse(cancels));
  }

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  });

  it('returns an empty map without querying when no agent ids are given', async () => {
    const res = await getPendingRestartActions(esClient, []);

    expect(res.size).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns an empty map without further queries when no RESTART action matches', async () => {
    mockSearch({});

    const res = await getPendingRestartActions(esClient, ['agent-1']);

    expect(res.size).toBe(0);
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.fleet-actions',
        query: {
          bool: {
            filter: [
              { term: { type: 'RESTART' } },
              { terms: { agents: ['agent-1'] } },
              { range: { expiration: { gt: expect.any(String) } } },
            ],
          },
        },
      })
    );
  });

  it('returns pending restart actions for the requested agents only', async () => {
    mockSearch({
      actions: [
        {
          action_id: 'action-1',
          agents: ['agent-1', 'agent-2', 'other-agent'],
          '@timestamp': '2026-11-06T10:00:00.000Z',
          expiration: '2026-12-06T10:00:00.000Z',
        },
      ],
    });

    const res = await getPendingRestartActions(esClient, ['agent-1', 'agent-2']);

    expect([...res.keys()]).toEqual(['agent-1', 'agent-2']);
    expect(res.get('agent-1')).toEqual({
      action_id: 'action-1',
      created_at: '2026-11-06T10:00:00.000Z',
      expiration: '2026-12-06T10:00:00.000Z',
    });
  });

  it('excludes agents that already have a result for the action', async () => {
    mockSearch({
      actions: [
        { action_id: 'action-1', agents: ['agent-1', 'agent-2'], '@timestamp': '2026-11-06' },
      ],
      results: [{ action_id: 'action-1', agent_id: 'agent-1' }],
    });

    const res = await getPendingRestartActions(esClient, ['agent-1', 'agent-2']);

    expect([...res.keys()]).toEqual(['agent-2']);
  });

  it('excludes cancelled actions', async () => {
    mockSearch({
      actions: [{ action_id: 'action-1', agents: ['agent-1'], '@timestamp': '2026-11-06' }],
      cancels: [{ data: { target_id: 'action-1' } }],
    });

    const res = await getPendingRestartActions(esClient, ['agent-1']);

    expect(res.size).toBe(0);
  });

  it('returns the latest pending action when an agent has several', async () => {
    mockSearch({
      actions: [
        { action_id: 'action-old', agents: ['agent-1'], '@timestamp': '2026-11-05T10:00:00Z' },
        { action_id: 'action-new', agents: ['agent-1'], '@timestamp': '2026-11-06T10:00:00Z' },
        { action_id: 'action-older', agents: ['agent-1'], '@timestamp': '2026-11-04T10:00:00Z' },
      ],
    });

    const res = await getPendingRestartActions(esClient, ['agent-1']);

    expect(res.get('agent-1')?.action_id).toBe('action-new');
  });
});
