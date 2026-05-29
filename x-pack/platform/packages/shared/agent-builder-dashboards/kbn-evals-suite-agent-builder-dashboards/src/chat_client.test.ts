/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { DashboardAgentEvaluationChatClient } from './chat_client';

const createLog = (): ToolingLog =>
  ({
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  } as unknown as ToolingLog);

describe('DashboardAgentEvaluationChatClient', () => {
  it('calls the converse API with connector, agent, conversation, and latest message', async () => {
    const fetch = jest.fn().mockResolvedValue({
      conversation_id: 'conversation-1',
      response: { message: 'hello back' },
      steps: [],
      trace_id: 'trace-1',
    }) as unknown as jest.MockedFunction<HttpHandler>;
    const client = new DashboardAgentEvaluationChatClient(fetch, createLog(), 'connector-1');

    const response = await client.converse({
      conversationId: 'conversation-0',
      messages: [{ message: 'first' }, { message: 'latest' }],
      options: { agentId: 'agent-1' },
    });

    expect(fetch).toHaveBeenCalledWith('/api/agent_builder/converse', {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify({
        agent_id: 'agent-1',
        connector_id: 'connector-1',
        conversation_id: 'conversation-0',
        input: 'latest',
      }),
    });
    expect(response).toEqual({
      conversationId: 'conversation-1',
      messages: [{ message: 'first' }, { message: 'latest' }, { message: 'hello back' }],
      steps: [],
      traceId: 'trace-1',
      errors: [],
    });
  });

  it('preserves tool-only steps when response message is absent', async () => {
    const steps = [{ type: 'tool_call', tool_id: 'platform.core.generate_esql' }];
    const fetch = jest.fn().mockResolvedValue({
      conversation_id: 'conversation-1',
      steps,
    }) as unknown as jest.MockedFunction<HttpHandler>;
    const client = new DashboardAgentEvaluationChatClient(fetch, createLog(), 'connector-1');

    const response = await client.converse({ messages: [{ message: 'create query' }] });

    expect(response.messages).toEqual([{ message: 'create query' }, { message: '' }]);
    expect(response.steps).toEqual(steps);
    expect(response.errors).toEqual([]);
  });

  it('returns a fallback response when the converse API fails', async () => {
    jest.useFakeTimers();
    const log = createLog();
    const fetch = jest
      .fn()
      .mockRejectedValue(new Error('boom')) as unknown as jest.MockedFunction<HttpHandler>;
    const client = new DashboardAgentEvaluationChatClient(fetch, log, 'connector-1');

    const responsePromise = client.converse({ messages: [{ message: 'hello' }] });
    await jest.advanceTimersByTimeAsync(10_000);
    const response = await responsePromise;

    expect(response.errors).toHaveLength(1);
    expect(response.messages.at(-1)?.message).toBe(
      'This question could not be answered as an internal error occurred. Please try again.'
    );
    expect(log.error).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
