/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import { buildAnalyzeChat } from './analyze_chat';

const aiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ds-my-index' },
  sources: [{ type: 'esql', value: 'FROM logs' }],
  automations: [
    { type: 'workflow', value: 'wf-1' },
    { type: 'workflow', value: 'wf-2' },
  ],
  feedback_analysis: { enabled: false, agent_id: 'agent-1' },
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('buildAnalyzeChat', () => {
  it('builds a single text attachment that lists linked workflow IDs', () => {
    const options = buildAnalyzeChat({ aiIndex: aiIndex() });

    expect(options.agentId).toBe('agent-1');
    expect(options.newConversation).toBe(true);
    expect(options.sessionTag).toBe('context-engine-feedback:my-index');
    expect(options.attachments).toHaveLength(1);
    expect(options.attachments[0]).toEqual({
      id: 'context-engine-ai-index:my-index',
      type: 'text',
      data: {
        content: [
          'AI index: my-index',
          'Dest: data_stream ds-my-index',
          'Sources:',
          '- esql: FROM logs',
          'Linked workflow IDs:',
          '- wf-1',
          '- wf-2',
        ].join('\n'),
      },
    });
  });

  it('does not attach workflow.yaml payloads', () => {
    const options = buildAnalyzeChat({ aiIndex: aiIndex() });
    expect(options.attachments.every((attachment) => attachment.type === 'text')).toBe(true);
  });

  it('notes when there are no linked workflows', () => {
    const options = buildAnalyzeChat({ aiIndex: aiIndex({ automations: [] }) });
    const content = (options.attachments[0].data as { content: string }).content;
    expect(content).toContain('Linked workflow IDs: none');
    expect(content).not.toContain('- wf-');
  });

  it('includes the description and managed marker when present', () => {
    const options = buildAnalyzeChat({
      aiIndex: aiIndex({ description: 'Support demo', managed: true }),
    });
    const content = (options.attachments[0].data as { content: string }).content;
    expect(content).toContain('AI index: my-index (managed)');
    expect(content).toContain('Description: Support demo');
  });

  it('passes through an undefined feedback agent (button gating handles the no-agent case)', () => {
    const options = buildAnalyzeChat({
      aiIndex: aiIndex({ feedback_analysis: undefined }),
    });
    expect(options.agentId).toBeUndefined();
  });
});
