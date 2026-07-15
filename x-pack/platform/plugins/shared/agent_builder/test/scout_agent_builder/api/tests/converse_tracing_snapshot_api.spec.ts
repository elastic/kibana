/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { AGENT_BUILDER_PUBLIC_API_HEADERS } from '../../../scout_agent_builder_shared/lib/kbn_public_api_headers';
import {
  mockTitleGeneration,
  mockAgentToolCall,
  mockFinalAnswer,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario/calls';
import type { ChatResponse } from '../../../../common/http_api/chat';
import { buildAgentBuilderTracesIndexPattern } from '../../../../common/traces';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { postConverse } from '../fixtures/converse_http';

const TRACE_INDEX = buildAgentBuilderTracesIndexPattern('default');

/** Top-level _source keys to drop entirely (environment-specific or volatile) */
const DROPPED_TOP_LEVEL_KEYS = new Set([
  'resource',
  'scope',
  'status',
  'data_stream',
  '@timestamp',
  'duration',
  'trace_id',
  'span_id',
  'parent_span_id',
]);

/** Attribute keys whose values should be replaced with a placeholder */
const PLACEHOLDER_ATTRIBUTES: Record<string, string> = {
  'gen_ai.conversation.id': '[CONVERSATION_ID]',
  'gen_ai.agent.id': '[AGENT_ID]',
  'gen_ai.tool.call.id': '[TOOL_CALL_ID]',
  'gen_ai.usage.input_tokens': '[TOKENS]',
  'gen_ai.usage.output_tokens': '[TOKENS]',
  'gen_ai.usage.cache_read.input_tokens': '[TOKENS]',
  'openai.raw_request': '[RAW_REQUEST]',
  'openai.raw_response': '[RAW_RESPONSE]',
  'gen_ai.tool.definitions': '[TOOL_DEFINITIONS]',
  'gen_ai.tool.description': '[TOOL_DESCRIPTION]',
  'gen_ai.tool.call.result': '[TOOL_RESULT]',
  'gen_ai.input.messages': '[INPUT_MESSAGES]',
  'gen_ai.output.messages': '[OUTPUT_MESSAGES]',
  'gen_ai.system_instructions': '[SYSTEM_INSTRUCTIONS]',
};

interface SpanEvent {
  name: string;
  time: unknown;
  attributes?: Record<string, unknown>;
}

const sanitizeAttributes = (attrs: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    // `kibana.*` attributes (e.g. feature-flag `kibana.flag_*` labels) are stamped onto
    // whatever OTel span is active at that moment, so they leak non-deterministically onto
    // these spans. Drop them.
    if (key.startsWith('kibana.')) continue;

    if (key in PLACEHOLDER_ATTRIBUTES) {
      if (value != null) {
        result[key] = PLACEHOLDER_ATTRIBUTES[key];
      }
      continue;
    }
    result[key] = value;
  }
  return result;
};

const sanitizeEvents = (events: SpanEvent[]): Array<{ name: string; attributes?: unknown }> =>
  events.map((event) => ({
    name: event.name,
    ...(event.attributes && Object.keys(event.attributes).length > 0
      ? { attributes: sanitizeAttributes(event.attributes) }
      : {}),
  }));

const sanitizeSpan = (span: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(span)) {
    if (DROPPED_TOP_LEVEL_KEYS.has(key)) continue;

    if (key === 'attributes' && value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeAttributes(value as Record<string, unknown>);
      continue;
    }
    if (key === 'events' && Array.isArray(value)) {
      result[key] = sanitizeEvents(value as SpanEvent[]);
      continue;
    }
    result[key] = value;
  }

  return result;
};

apiTest.describe(
  'Agent Builder — tracing snapshot',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient, esClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;

      // Clean any leftover trace data from previous runs
      await esClient.deleteByQuery({
        index: TRACE_INDEX,
        query: { match_all: {} },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });

      // Create a custom skill
      await kbnClient.request({
        method: 'POST',
        path: `${API_AGENT_BUILDER}/skills`,
        headers: AGENT_BUILDER_PUBLIC_API_HEADERS,
        body: {
          id: 'test_skill',
          name: 'test_skill',
          description: 'A test skill for tracing snapshot',
          content: 'Follow these instructions for test_skill.',
          tool_ids: [],
        },
        ignoreErrors: [409],
      });

      // Create a custom agent
      await kbnClient.request({
        method: 'DELETE',
        path: `${API_AGENT_BUILDER}/agents/test_agent`,
        headers: AGENT_BUILDER_PUBLIC_API_HEADERS,
        ignoreErrors: [404],
      });
      await kbnClient.request({
        method: 'POST',
        path: `${API_AGENT_BUILDER}/agents`,
        headers: AGENT_BUILDER_PUBLIC_API_HEADERS,
        body: {
          id: 'test_agent',
          name: 'test_agent',
          description: 'Agent for tracing snapshot test',
          labels: [],
          configuration: {
            instructions: 'You are a test agent. Use tools when asked.',
            tools: [{ tool_ids: ['*'] }],
            skill_ids: ['test_skill'],
          },
        },
      });
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      await deleteAllConversationsFromEs(esClient);
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
      await kbnClient.request({
        method: 'DELETE',
        path: `${API_AGENT_BUILDER}/agents/test_agent`,
        headers: AGENT_BUILDER_PUBLIC_API_HEADERS,
        ignoreErrors: [404],
      });
      await kbnClient.request({
        method: 'DELETE',
        path: `${API_AGENT_BUILDER}/skills/test_skill`,
        headers: AGENT_BUILDER_PUBLIC_API_HEADERS,
        ignoreErrors: [404],
      });
    });

    apiTest(
      'trace documents match snapshot after conversation with tool call',
      async ({ apiClient, esClient }) => {
        const EXPECTED_SPAN_COUNT = 7;
        let hits: Array<{ _source?: unknown }> = [];

        // Mock the conversation and tool call
        mockTitleGeneration(llmProxy, 'Test Conversation');
        mockAgentToolCall({
          llmProxy,
          toolName: 'platform_core_list_indices',
          toolArg: { pattern: '*' },
        });
        mockFinalAnswer(llmProxy, 'Here are the results from the tool call.');

        // Agent Builder conversation
        const res = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: 'List all indices', connector_id: connectorId, agent_id: 'test_agent' },
          'local'
        );
        expect(res).toHaveStatusCode(200);
        const { conversation_id: conversationId } = res.body as ChatResponse;
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        // Wait for the spans to be indexed
        await expect
          .poll(
            async () => {
              const indexExists = await esClient.indices.exists({ index: TRACE_INDEX });
              if (!indexExists) {
                return 0;
              }
              await esClient.indices.refresh({ index: TRACE_INDEX });
              const traceResult = await esClient.search({
                index: TRACE_INDEX,
                sort: [{ '@timestamp': 'asc' }],
                query: {
                  term: { 'attributes.gen_ai.conversation.id': conversationId },
                },
              });
              hits = traceResult.hits.hits;
              return hits.length;
            },
            { timeout: 30_000, intervals: [500, 1000, 2000] }
          )
          .toBe(EXPECTED_SPAN_COUNT);

        const spans = hits
          .map((hit, i) => ({ span: sanitizeSpan(hit._source as Record<string, unknown>), i }))
          .sort((a, b) => {
            const cmp = JSON.stringify(a.span).localeCompare(JSON.stringify(b.span));
            return cmp !== 0 ? cmp : a.i - b.i;
          })
          .map(({ span }) => span);

        const expectedSpans = JSON.parse(
          readFileSync(resolve(__dirname, './fixtures/expected_trace_spans.json'), 'utf-8')
        );
        expect(spans).toStrictEqual(expectedSpans);
      }
    );
  }
);
