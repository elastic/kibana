/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { resolveHostCapability } from './resolve_host_capability';

const searchHit = (endpointId?: string) => ({
  hits: {
    hits: endpointId
      ? [{ _index: 'metrics-endpoint.metadata-default', _source: { agent: { id: endpointId } } }]
      : [],
  },
});

describe('resolveHostCapability', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mark a host Endpoint-capable and return its endpoint id when metadata is found', async () => {
    esClient.search.mockResolvedValueOnce(searchHit('endpoint-123') as never);

    const verdict = await resolveHostCapability(esClient, 'fleet-agent-1');

    expect(verdict).toEqual({
      agentId: 'fleet-agent-1',
      endpointCapable: true,
      endpointId: 'endpoint-123',
    });
  });

  it('should mark an osquery-only host browse-only when no metadata is found', async () => {
    esClient.search.mockResolvedValueOnce(searchHit() as never);

    const verdict = await resolveHostCapability(esClient, 'fleet-agent-2');

    expect(verdict).toEqual({ agentId: 'fleet-agent-2', endpointCapable: false });
    expect(verdict.endpointId).toBeUndefined();
  });

  it('should collapse to not-capable when the metadata lookup throws (e.g. index missing)', async () => {
    esClient.search.mockRejectedValueOnce(new Error('index_not_found_exception') as never);

    const verdict = await resolveHostCapability(esClient, 'fleet-agent-3');

    expect(verdict).toEqual({ agentId: 'fleet-agent-3', endpointCapable: false });
  });

  it('should query the endpoint metadata index filtered by the Fleet agent id', async () => {
    esClient.search.mockResolvedValueOnce(searchHit('endpoint-9') as never);

    await resolveHostCapability(esClient, 'fleet-agent-9');

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'metrics-endpoint.metadata-*',
        ignore_unavailable: true,
        query: { bool: { filter: [{ term: { 'agent.id': 'fleet-agent-9' } }] } },
      })
    );
  });
});
