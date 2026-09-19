/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { ToolingLog } from '@kbn/tooling-log';
import { createAgentBuilderClient, type AgentBuilderClient } from './agent_builder_client';

describe('createAgentBuilderClient', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let log: ToolingLog;
  let client: AgentBuilderClient;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    log = { warning: jest.fn() } as unknown as ToolingLog;
    client = createAgentBuilderClient({ fetch: http.fetch, log, connectorId: 'my-connector' });
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

  it('creates a private conversation', async () => {
    http.fetch.mockResolvedValue({ id: 'conv-1' });

    await expect(
      client.createConversation({ agentId: 'my-agent', title: 'Feature identification: logs.test' })
    ).resolves.toEqual({ id: 'conv-1' });

    expect(http.fetch).toHaveBeenCalledWith('/api/agent_builder/conversations', {
      method: 'POST',
      version: '2023-10-31',
      body: expect.any(String),
    });
    expect(lastRequestBody()).toEqual({
      agent_id: 'my-agent',
      title: 'Feature identification: logs.test',
      access_control: { access_mode: 'private' },
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
      prompts: [],
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
      prompts: [],
    });
  });

  it('sends promptResponses as prompts instead of input when provided', async () => {
    http.fetch.mockResolvedValue({});

    await client.converse({
      agentId: 'my-agent',
      input: 'ignored',
      conversationId: 'conv-1',
      promptResponses: { 'ask-1': { answers: [{ custom: 'answer' }] } },
    });

    const body = lastRequestBody();
    expect(body.prompts).toEqual({ 'ask-1': { answers: [{ custom: 'answer' }] } });
    expect(body.input).toBeUndefined();
  });

  it('returns prompts from the API response', async () => {
    const agentPrompt = { type: 'ask_user_question', id: 'ask-1', questions: [] };
    http.fetch.mockResolvedValue({
      conversation_id: 'conv-1',
      response: { message: 'What would you like?', prompts: [agentPrompt] },
    });

    const result = await client.converse({ agentId: 'my-agent', input: 'hello' });

    expect(result.prompts).toEqual([agentPrompt]);
  });

  it('fetches a conversation by id via getConversation', async () => {
    const conversation = { id: 'conv-1', rounds: [{ input: 'hi', response: 'hello' }] };
    http.fetch.mockResolvedValue(conversation);

    const result = await client.getConversation('conv-1');

    expect(http.fetch).toHaveBeenCalledWith('/api/agent_builder/conversations/conv-1', {
      method: 'GET',
      version: '2023-10-31',
    });
    expect(result).toEqual(conversation);
  });

  // ── configurationOverrides → configuration_overrides ───────────────────────
  // Suites pin a skill (or tools, or capabilities) per eval run through this
  // translation, so a camelCase→snake_case slip here silently unpins every suite
  // that relies on it. Each field is asserted separately, including the values
  // that are easy to drop: explicit `false`, empty arrays and empty strings.
  describe('configurationOverrides', () => {
    it('omits configuration_overrides entirely when not provided', async () => {
      http.fetch.mockResolvedValue({});

      await client.converse({ agentId: 'my-agent', input: 'question' });

      expect(lastRequestBody().configuration_overrides).toBeUndefined();
    });

    it('translates all four override fields to snake_case', async () => {
      http.fetch.mockResolvedValue({});

      await client.converse({
        agentId: 'my-agent',
        input: 'question',
        configurationOverrides: {
          instructions: 'answer only from telemetry',
          tools: [{ toolIds: ['execute_esql', 'generate_esql'] }],
          skillIds: ['deep-watch-forensics'],
          enableElasticCapabilities: true,
        },
      });

      expect(lastRequestBody().configuration_overrides).toEqual({
        instructions: 'answer only from telemetry',
        tools: [{ tool_ids: ['execute_esql', 'generate_esql'] }],
        skill_ids: ['deep-watch-forensics'],
        enable_elastic_capabilities: true,
      });
    });

    it('keeps an explicit false and empty arrays rather than dropping them', async () => {
      // `enableElasticCapabilities: false` is a real instruction (disable the
      // platform capabilities), not an absent value — a truthiness check would
      // silently re-enable them. Same for empty lists, which mean "pin nothing".
      http.fetch.mockResolvedValue({});

      await client.converse({
        agentId: 'my-agent',
        input: 'question',
        configurationOverrides: {
          instructions: '',
          tools: [],
          skillIds: [],
          enableElasticCapabilities: false,
        },
      });

      expect(lastRequestBody().configuration_overrides).toEqual({
        instructions: '',
        tools: [],
        skill_ids: [],
        enable_elastic_capabilities: false,
      });
    });

    it('translates a subset without inventing the other fields', async () => {
      http.fetch.mockResolvedValue({});

      await client.converse({
        agentId: 'my-agent',
        input: 'question',
        configurationOverrides: { skillIds: ['deep-watch-forensics'] },
      });

      expect(lastRequestBody().configuration_overrides).toEqual({
        skill_ids: ['deep-watch-forensics'],
      });
    });

    it('maps every tool entry, not just the first', async () => {
      http.fetch.mockResolvedValue({});

      await client.converse({
        agentId: 'my-agent',
        input: 'question',
        configurationOverrides: {
          tools: [{ toolIds: ['a'] }, { toolIds: ['b', 'c'] }],
        },
      });

      expect(lastRequestBody().configuration_overrides).toEqual({
        tools: [{ tool_ids: ['a'] }, { tool_ids: ['b', 'c'] }],
      });
    });
  });
});
