/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { toProperties } from './use_save_ai_index_field';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM logs-*' }],
  traces: [
    { type: 'index', value: 'logs-*', query: 'FROM logs-*' },
    { type: 'elastic_agent', value: 'my-agent', query: 'FROM traces-agent_builder.otel-default' },
  ],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

describe('toProperties', () => {
  it('strips server-managed fields and derived trace queries', () => {
    expect(toProperties(aiIndex)).toEqual({
      dest: aiIndex.dest,
      automations: [],
      sources: [{ type: 'esql', value: 'FROM logs-*' }],
      traces: [
        { type: 'index', value: 'logs-*' },
        { type: 'elastic_agent', value: 'my-agent' },
      ],
    });
  });
});
