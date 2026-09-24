/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetTraceEvidenceResponse } from './traces/get_trace_evidence_route.gen';

describe('GetTraceEvidenceResponse', () => {
  const evidenceStatus = {
    user_query: 'found' as const,
    agent_response: 'found' as const,
    tool_calls: 'found' as const,
  };

  it('accepts unbounded message content and arbitrary optional tool JSON', () => {
    const longMessage = 'x'.repeat(100_000);
    const result = GetTraceEvidenceResponse.safeParse({
      status: 'resolved',
      trace_id: '0af7651916cd43dd8448eb211c80319c',
      best_effort: true,
      profile: 'elastic-inference',
      evidence: {
        input: { message: longMessage },
        response: { message: longMessage },
        steps: [
          { tool_id: 'search', arguments: { nested: [1, true, null] }, result: ['ok'] },
          { tool_id: 'optional-payloads' },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts unresolved diagnostics without an evidence field', () => {
    const result = GetTraceEvidenceResponse.safeParse({
      status: 'unresolved',
      trace_id: '0af7651916cd43dd8448eb211c80319c',
      profile: null,
      profile_diagnostics: Array.from({ length: 5 }, () => ({
        profile: 'elastic-inference',
        evidence: evidenceStatus,
      })),
    });

    expect(result.success).toBe(true);
  });
});
