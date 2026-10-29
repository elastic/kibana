/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { MemoryService } from './memory_service';

const columns = [
  'id',
  '@timestamp',
  'type',
  'title',
  'description',
  'content',
  'tags',
  'updated_at',
  'expires_at',
  'attributes',
].map((name) => ({ name }));

const row = (id: string, agentId: string, tags: string | string[] | null) => [
  id,
  '2026-10-27T10:00:00.000Z',
  'memory.short_term.session_fact',
  `Title ${id}`,
  'A description',
  'Some content',
  tags,
  '2026-10-27T11:00:00.000Z',
  null,
  {
    'memory.user_id': 'u_alice',
    'memory.user_name': 'alice',
    'memory.agent_id': agentId,
    'memory.session_id': 'conversation-1',
    'memory.space': 'default',
    'memory.promotion.status': 'pending',
  },
];

describe('MemoryService', () => {
  const setup = () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue({ dest: { value: '.ai-index-idx-elastic-index' } });
    http.post.mockResolvedValue({
      columns,
      values: [row('memory-1', 'agent-1', 'logs'), row('memory-2', 'agent-2', ['a', 'b'])],
    });
    http.delete.mockResolvedValue({});
    return { http, service: new MemoryService({ http }) };
  };

  it('lists short-term memories through the AI index query API, for one agent', async () => {
    const { http, service } = setup();

    const { results } = await service.list({ agentId: 'agent-1' });

    expect(http.get).toHaveBeenCalledWith('/api/context_engine/ai_index/elastic', {
      version: '2023-10-31',
    });
    expect(http.post).toHaveBeenCalledWith('/api/context_engine/ai_index/_query', {
      version: '2023-10-31',
      body: expect.stringContaining(
        '"query":"FROM .ai-index-idx-elastic-index | WHERE type LIKE ?type'
      ),
    });
    expect(http.post).toHaveBeenCalledWith(
      '/api/context_engine/ai_index/_query',
      expect.objectContaining({ body: expect.stringContaining('"type":"memory.short_term.*"') })
    );
    expect(results).toEqual([
      expect.objectContaining({
        id: 'memory-1',
        type: 'memory.session_fact',
        tags: ['logs'],
        user_name: 'alice',
        agent_id: 'agent-1',
        promotion: { status: 'pending' },
      }),
    ]);
  });

  it('deletes a memory through the AI index KI API, and every listed one for delete all', async () => {
    const { http, service } = setup();

    await expect(service.deleteAll({ agentId: 'agent-2' })).resolves.toEqual({ deleted: 1 });

    expect(http.delete).toHaveBeenCalledTimes(1);
    expect(http.delete).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/elastic/kis/memory-2',
      { version: '1' }
    );
  });
});
