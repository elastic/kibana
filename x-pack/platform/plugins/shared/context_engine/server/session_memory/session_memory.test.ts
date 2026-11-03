/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SessionMemoryService } from './session_memory';

describe('SessionMemoryService', () => {
  it('POSTs a memory to the ES remember endpoint', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const body = {
      session_id: 's-1',
      user_id: 'u-1',
      agent_id: 'a-1',
      content: 'Prefers dark mode',
    };
    const stored = { ...body, id: 'm-1', '@timestamp': '2026-01-01T00:00:00.000Z' };
    esClient.transport.request.mockResolvedValue(stored);

    await expect(new SessionMemoryService(esClient).remember(body)).resolves.toEqual(stored);

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_context_engine/session_memory/_remember',
      body,
    });
  });

  it('POSTs a query to the ES search endpoint', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const hits = { count: 0, results: [] };
    esClient.transport.request.mockResolvedValue(hits);

    await expect(
      new SessionMemoryService(esClient).search({ query: 'dark mode', user_id: 'u-1' })
    ).resolves.toEqual(hits);

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_context_engine/session_memory/_search',
      body: { query: 'dark mode', user_id: 'u-1' },
    });
  });
});
