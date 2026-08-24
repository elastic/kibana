/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import type { GetFeedbackContextResponse } from '../common/http_api/feedback_loop';
import { getFeedbackContext } from './application/api/feedback_loop';
import { buildAnalyzeChat } from './analyze_chat';

jest.mock('./application/api/feedback_loop', () => ({ getFeedbackContext: jest.fn() }));

const mockGetFeedbackContext = getFeedbackContext as jest.MockedFunction<typeof getFeedbackContext>;

const aiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ds-my-index' },
  sources: [{ type: 'esql', value: 'FROM logs' }],
  automations: [{ type: 'workflow', value: 'wf-1' }],
  feedback_agent_id: 'agent-1',
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const feedbackContext = (
  overrides: Partial<GetFeedbackContextResponse> = {}
): GetFeedbackContextResponse => ({
  ai_index: aiIndex(),
  ki_summary: { count: 3, counts_by_type: [] },
  signal_groups: [],
  improvements: [],
  signals_index: 'context-engine-signals-default',
  agent_id: 'agent-1',
  prompt: 'You are reviewing the my-index AI index.',
  ...overrides,
});

const http = {} as HttpStart;

describe('buildAnalyzeChat', () => {
  beforeEach(() => mockGetFeedbackContext.mockResolvedValue(feedbackContext()));
  afterEach(() => jest.clearAllMocks());

  it('hands over the same briefing a scheduled run gets', async () => {
    const options = await buildAnalyzeChat({ aiIndex: aiIndex() }, { http });

    expect(mockGetFeedbackContext).toHaveBeenCalledWith(http, { aiIndexId: 'my-index' });
    expect(options.newConversation).toBe(true);
    expect(options.sessionTag).toBe('context-engine-feedback:my-index');
    expect(options.attachments).toEqual([
      {
        id: 'context-engine-ai-index:my-index',
        type: 'text',
        data: { content: 'You are reviewing the my-index AI index.' },
      },
    ]);
  });

  it('opens the agent the server resolved, not the one on the index', async () => {
    // An index without its own agent falls back to the built-in one, which the route resolves.
    mockGetFeedbackContext.mockResolvedValue(
      feedbackContext({ agent_id: 'platform.context_engine.feedback_loop' })
    );

    const options = await buildAnalyzeChat(
      { aiIndex: aiIndex({ feedback_agent_id: undefined }) },
      { http }
    );

    expect(options.agentId).toBe('platform.context_engine.feedback_loop');
  });

  it('sends the ask without waiting for the user', async () => {
    const options = await buildAnalyzeChat({ aiIndex: aiIndex() }, { http });

    expect(options.autoSendInitialMessage).toBe(true);
    expect(options.initialMessage).toContain('my-index');
  });

  it('narrows the ask to a group when opened from one', async () => {
    const options = await buildAnalyzeChat(
      { aiIndex: aiIndex(), tag: 'tool_call_no_results' },
      { http }
    );

    expect(options.initialMessage).toContain('tool_call_no_results');
  });

  it('propagates a failure to fetch the briefing', async () => {
    mockGetFeedbackContext.mockRejectedValue(new Error('boom'));

    await expect(buildAnalyzeChat({ aiIndex: aiIndex() }, { http })).rejects.toThrow('boom');
  });
});
