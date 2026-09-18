/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createAgentBuilderClient, type AgentBuilderClient } from './agent_builder_client';

describe('createAgentBuilderClient', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let client: AgentBuilderClient;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    client = createAgentBuilderClient({ fetch: http.fetch, connectorId: 'my-connector' });
  });

  // jest types `http.fetch.mock.lastCall` from the single-arg `HttpHandler` overload, so reading the
  // `(path, options)` call we actually make needs one narrow cast. Localize it here and parse the
  // JSON body so assertions are order-independent.
  const lastRequestBody = (): Record<string, unknown> => {
    const lastCall = http.fetch.mock.lastCall as unknown as [string, { body: string }];
    return JSON.parse(lastCall[1].body);
  };

  it('calls http.fetch with the right parameters', async () => {
    http.fetch.mockResolvedValue({});

    await client.converse({ agentId: 'my-agent', input: 'question' });

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith('/api/agent_builder/converse', {
      method: 'POST',
      version: '2023-10-31',
      body: expect.any(String),
    });

    expect(lastRequestBody()).toEqual({
      agent_id: 'my-agent',
      connector_id: 'my-connector',
      input: 'question',
      // Inline execution so the agent's gen_ai spans nest under the eval's trace.
      _execution_mode: 'local',
    });
  });

  it('forwards conversation_id only when a conversationId is provided', async () => {
    http.fetch.mockResolvedValue({});

    await client.converse({
      agentId: 'my-agent',
      input: 'follow up',
      conversationId: 'conv-1',
    });

    expect(lastRequestBody()).toEqual({
      agent_id: 'my-agent',
      connector_id: 'my-connector',
      input: 'follow up',
      _execution_mode: 'local',
      conversation_id: 'conv-1',
    });
  });

  it('maps the converse API response to the client response shape', async () => {
    http.fetch.mockResolvedValue({
      conversation_id: 'conv-2',
      trace_id: 'trace-2',
      steps: [{ type: 'tool_call', tool_id: 'execute_esql' }],
      response: { message: 'final answer', structured_output: { foo: 'bar' } },
    });

    const result = await client.converse({ agentId: 'my-agent', input: 'question' });

    expect(result).toEqual({
      message: 'final answer',
      steps: [{ type: 'tool_call', tool_id: 'execute_esql' }],
      structuredOutput: { foo: 'bar' },
      conversationId: 'conv-2',
      traceId: 'trace-2',
    });
  });

  it('falls back to an empty message and steps when the API omits them', async () => {
    http.fetch.mockResolvedValue({});

    const result = await client.converse({ agentId: 'my-agent', input: 'question' });

    expect(result).toEqual({
      message: '',
      steps: [],
      structuredOutput: undefined,
      conversationId: undefined,
      traceId: undefined,
    });
  });

  // Retries belong to `httpHandlerFromKbnClient` (status-aware backoff, honors `retry-after`,
  // covers transport errors). A second retry layer here multiplies with it — the two layers
  // used to issue up to 24 requests for a single turn against an already-saturated gateway.
  it('does not retry a failing request itself, leaving retries to the http handler', async () => {
    http.fetch.mockRejectedValue(new Error('429 Too Many Requests'));

    await expect(client.converse({ agentId: 'my-agent', input: 'question' })).rejects.toThrow(
      '429 Too Many Requests'
    );

    expect(http.fetch).toHaveBeenCalledTimes(1);
  });
});
