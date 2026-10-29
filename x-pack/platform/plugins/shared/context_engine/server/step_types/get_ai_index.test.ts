/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexService } from '../ai_indices/service';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import { getGetAiIndexStepDefinition } from './get_ai_index';
import { createMockStepContext } from './test_utils';

const aiIndex = {
  id: 'support',
  managed: false,
  memory_enabled: true,
  dest: { type: 'index', value: 'ai-index-idx-support' },
  sources: [{ type: 'esql', value: 'FROM orders' }],
  traces: [
    {
      type: 'elastic_agent',
      value: 'elastic-ai-agent',
      query: 'FROM traces-agent_builder.otel-space-1\n| INLINE STATS …',
    },
  ],
};

const defineStep = () =>
  getGetAiIndexStepDefinition({
    getAiIndexService: () =>
      ({ get: jest.fn().mockResolvedValue(aiIndex) } as unknown as AiIndexService),
    getAiIndexDataReadService: () => ({} as AiIndexDataReadServiceApi),
    isContextEngineEnabled: async () => true,
    checkReadPrivilege: async () => true,
    checkWritePrivilege: async () => true,
  });

describe('context-engine.getAiIndex', () => {
  it('returns the trace queries as the AI index resolves them', async () => {
    const result = await defineStep().handler(
      createMockStepContext({ input: { ai_index_id: 'support' }, esClient: {} })
    );

    expect(result.output?.traces).toEqual(aiIndex.traces);
  });

  it('windows the trace queries before they group spans by trace', async () => {
    const result = await defineStep().handler(
      createMockStepContext({
        input: { ai_index_id: 'support', traces_since_hours: 5 },
        esClient: {},
        spaceId: 'space-1',
      })
    );

    const [trace] = result.output?.traces ?? [];
    expect(trace).toMatchObject({ type: 'elastic_agent', value: 'elastic-ai-agent' });
    expect(trace.query.split('\n').slice(0, 3)).toEqual([
      'FROM traces-agent_builder.otel-space-1',
      '| WHERE @timestamp >= NOW() - 5 hours',
      expect.stringMatching(/^\| INLINE STATS agent_runs = COUNT\(\*\)/),
    ]);
  });
});
