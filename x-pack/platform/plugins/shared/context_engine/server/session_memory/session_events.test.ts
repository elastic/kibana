/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SessionEventsService } from './session_events';

describe('SessionEventsService', () => {
  it('POSTs the event to the ES session events save endpoint', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const body = { session_id: 's-1', user_id: 'u-1', agent_id: 'a-1', transcript: 'user: hi' };
    const stored = { ...body, id: 'e-1', '@timestamp': '2026-01-01T00:00:00.000Z' };
    esClient.transport.request.mockResolvedValue(stored);

    await expect(new SessionEventsService(esClient).save(body)).resolves.toEqual(stored);

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_context_engine/session_events/_save',
      body,
    });
  });
});
