/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStepType,
  type EsqlResults,
  type QueryResult,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apm, timerange } from '@kbn/synthtrace-client';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ChatResponse } from '../../../../common/http_api/chat';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentCallSearchToolWithEsqlThenAnswer,
  setupAgentParallelToolCallsThenAnswer,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { postConverse, type ExecutionMode } from '../fixtures/converse_http';

// Tool-result messages on the wire may be wrapped in a <tool_result> envelope and/or
// a {response: "..."} layer added by inference-langchain when the inner content is
// not valid JSON. Strip both so assertions can target the original {results: [...]} payload.
const parseToolMessageContent = (raw: string): { results: [QueryResult, EsqlResults] } => {
  let payload: unknown = raw;
  try {
    payload = JSON.parse(raw);
  } catch {
    // raw is not JSON — likely a bare envelope string, fall through.
  }
  if (typeof payload === 'object' && payload !== null && 'response' in payload) {
    payload = (payload as { response: unknown }).response;
  }
  if (typeof payload === 'string') {
    const stripped = payload.replace(/^<tool_result>|<\/tool_result>$/g, '');
    return JSON.parse(stripped);
  }
  return payload as { results: [QueryResult, EsqlResults] };
};

const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];

apiTest.describe(
  'Agent Builder — converse tool calling API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient, apmSynthtraceEsClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
      await apmSynthtraceEsClient.clean();
    });

    for (const mode of EXECUTION_MODES) {
      apiTest(
        `[${mode}] single tool call (search with esql)`,
        async ({ apiClient, apmSynthtraceEsClient }) => {
          await apmSynthtraceEsClient.clean();
          const myService = apm
            .service({ name: 'java-backend', environment: 'production', agentName: 'java' })
            .instance('my-instance');
          const events = timerange('now-15m', 'now')
            .interval('1m')
            .rate(1)
            .generator((timestamp) => [
              myService
                .transaction({ transactionName: 'GET /user/123' })
                .timestamp(timestamp)
                .duration(1000),
            ]);
          await apmSynthtraceEsClient.index(events);

          const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
          const MOCKED_ESQL_QUERY =
            'FROM traces-apm-default\n| WHERE service.name == "java-backend"\n| LIMIT 100';

          await setupAgentCallSearchToolWithEsqlThenAnswer({
            proxy: llmProxy,
            title: 'Mocked conversation title',
            resourceName: 'traces-apm-default',
            resourceType: 'data_stream',
            response: MOCKED_LLM_RESPONSE,
            esqlQuery: MOCKED_ESQL_QUERY,
          });

          const res = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            {
              input: 'Please find a single trace with `service.name:java-backend`',
              connector_id: connectorId,
            },
            mode
          );
          expect(res).toHaveStatusCode(200);
          const body = res.body as ChatResponse;
          conversationIds.push(body.conversation_id);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const handoverRequest = llmProxy.interceptedRequests.find(
            (request) => request.matchingInterceptorName === 'handover-to-answer'
          )?.requestBody;
          expect(handoverRequest).toBeDefined();
          const esqlToolCallMsg = handoverRequest!.messages[handoverRequest!.messages.length - 1]!;
          expect(esqlToolCallMsg.role).toBe('tool');
          const toolCallContent = parseToolMessageContent(String(esqlToolCallMsg.content));
          const [queryResult, esqlResults] = toolCallContent.results;

          expect(queryResult.type).toBe('query');
          expect('esql' in queryResult.data ? queryResult.data.esql : '').toBe(MOCKED_ESQL_QUERY);
          expect(esqlResults.type).toBe('esql_results');
          expect(esqlResults.tool_result_id).toBeDefined();
          expect(esqlResults.data.query).toBe(MOCKED_ESQL_QUERY);
          expect(esqlResults.data.values).toHaveLength(15);
          expect(body.response.message).toBe(MOCKED_LLM_RESPONSE);
        }
      );

      apiTest(`[${mode}] parallel tool calls`, async ({ apiClient }) => {
        const MOCKED_LLM_RESPONSE = 'Here are the results from both tools';
        await setupAgentParallelToolCallsThenAnswer({
          proxy: llmProxy,
          title: 'Parallel tool calls',
          response: MOCKED_LLM_RESPONSE,
          toolCalls: [
            { name: 'platform_core_list_indices', args: { pattern: '*' } },
            {
              name: 'platform_core_get_index_mapping',
              args: { indices: ['traces-apm-default'] },
            },
          ],
        });

        const res = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            input: 'List all indices and get mappings for traces-apm-default',
            connector_id: connectorId,
          },
          mode
        );
        expect(res).toHaveStatusCode(200);
        const body = res.body as ChatResponse;
        conversationIds.push(body.conversation_id);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(body.response.message).toBe(MOCKED_LLM_RESPONSE);
        const toolCallSteps = body.steps.filter(
          (step) => step.type === ConversationRoundStepType.toolCall
        ) as ToolCallStep[];
        expect(toolCallSteps).toHaveLength(2);
        const groupId = toolCallSteps[0].tool_call_group_id;
        expect(typeof groupId).toBe('string');
        expect(groupId).not.toBe('');
        expect(toolCallSteps[1].tool_call_group_id).toBe(groupId);
        expect(toolCallSteps[0].results.length).toBeGreaterThan(0);
        expect(toolCallSteps[1].results.length).toBeGreaterThan(0);
      });
    }
  }
);
