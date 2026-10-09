/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import {
  NON_INTERACTIVE_DECLINED_REASON,
  TimelineEventType,
  ToolResultType,
  isToolCallStep,
  type ConversationRoundStep,
  type ExecutionOutcome,
} from '@kbn/agent-builder-common';
import type { ChatMessageResponse } from '../../../../../common/http_api/chat';
import { chatApiPath } from '../../../../../common/constants';
import {
  createAgentViaKbn,
  deleteAgentViaKbn,
} from '../../../../scout_agent_builder_shared/lib/agents_kbn';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentCallToolThenAnswer,
  setupAgentDirectAnswer,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { createToolViaKbn } from '../../../../scout_agent_builder_shared/lib/tools_kbn';
import {
  apiTest,
  API_AGENT_BUILDER,
  COMMON_HEADERS,
  getConversation,
  type ScoutAgentBuilderApiClient,
} from '../fixtures';

const CHAT_MESSAGE = `${chatApiPath}/message`;

// Per-run ids: the suite may run twice against the same stack.
const RUN_ID = Date.now().toString(36);
/** A tool that asks for confirmation before every call, and an agent that can use it. */
const HITL_TOOL_ID = `message-hitl-tool-${RUN_ID}`;
const HITL_AGENT_ID = `message-hitl-agent-${RUN_ID}`;
const UNKNOWN_AGENT_ID = `message-no-such-agent-${RUN_ID}`;
/** Matches the conversation id embedded in `Conversation <id> not found` error messages. */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const postChatMessage = (
  apiClient: ScoutAgentBuilderApiClient,
  authHeaders: Record<string, string>,
  body: Record<string, unknown>
) =>
  apiClient.post(CHAT_MESSAGE, {
    headers: { ...COMMON_HEADERS, ...authHeaders },
    body,
    responseType: 'json',
  });

/**
 * `POST /api/chat/message`: the CLI-friendly, text-only surface. It runs the same execution service
 * as the converse routes, on Task Manager since no `_execution_mode` can be passed, so we assert
 * the delta: a minimal request, an answer-only response, and HITL prompts declined instead of
 * pausing the run. The route is gated on `agentBuilder:experimentalFeatures`, which the Scout
 * server config force-enables.
 */
apiTest.describe(
  'Agent Builder — chat API message (/api/chat/message)',
  { tag: [...tags.local.stateful.classic, ...tags.local.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    let previousDefaultConnector: string | undefined;
    const conversationIds = new Set<string>();

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

      // The request carries no connector: pin the proxy connector as the default so the run
      // resolves to it whatever else the stack has configured.
      const currentDefaultConnector = await kbnClient.uiSettings.get(
        GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
      );
      previousDefaultConnector =
        typeof currentDefaultConnector === 'string' ? currentDefaultConnector : undefined;
      await kbnClient.uiSettings.update({ [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: connectorId });

      await createToolViaKbn(kbnClient, {
        id: HITL_TOOL_ID,
        type: 'esql',
        description: 'A tool that always asks for confirmation',
        tags: ['test'],
        configuration: { query: 'ROW answer = 42', params: {} },
        confirmation: { askUser: 'always' },
      });
      await createAgentViaKbn(kbnClient, { id: HITL_AGENT_ID, name: 'Message HITL agent' });
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const conversationId of conversationIds) {
        await asAdmin.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`
        );
      }
      await deleteAgentViaKbn(kbnClient, HITL_AGENT_ID);
      await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(HITL_TOOL_ID)}`);

      if (previousDefaultConnector === undefined) {
        await kbnClient.uiSettings.unset(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
      } else {
        await kbnClient.uiSettings.update({
          [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: previousDefaultConnector,
        });
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    apiTest(
      'answers a new conversation with text only, then continues it with the returned conversation_id',
      async ({ apiClient }) => {
        const conversationId = await apiTest.step(
          'a message alone starts a conversation and returns the answer',
          async () => {
            await setupAgentDirectAnswer({
              proxy: llmProxy,
              title: 'Message API title',
              response: 'Elasticsearch is a search engine.',
            });

            const res = await postChatMessage(apiClient, adminCredentials.apiKeyHeader, {
              message: 'What is Elasticsearch?',
            });
            expect(res).toHaveStatusCode(200);
            await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

            const body = res.body as ChatMessageResponse;
            expect(typeof body.conversation_id).toBe('string');
            conversationIds.add(body.conversation_id);
            // Nothing but the two always-present fields: no timeline, no rounds, no events, and no
            // `declined_prompts` since nothing was declined.
            expect(body).toStrictEqual({
              conversation_id: body.conversation_id,
              answer: 'Elasticsearch is a search engine.',
            });

            return body.conversation_id;
          }
        );

        await apiTest.step('the run is stored as a completed execution', async () => {
          const stored = await getConversation(
            apiClient,
            adminCredentials.apiKeyHeader,
            conversationId
          );
          expect(stored.title).toBe('Message API title');
          expect(stored.events?.map(({ type }) => type)).toStrictEqual([
            TimelineEventType.userMessage,
            TimelineEventType.executionStarted,
            TimelineEventType.executionTerminated,
          ]);
        });

        await apiTest.step('the same conversation_id continues the conversation', async () => {
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            continueConversation: true,
            response: 'Kibana is its UI.',
          });

          const res = await postChatMessage(apiClient, adminCredentials.apiKeyHeader, {
            message: 'And Kibana?',
            conversation_id: conversationId,
          });
          expect(res).toHaveStatusCode(200);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(res.body).toStrictEqual({
            conversation_id: conversationId,
            answer: 'Kibana is its UI.',
          });

          const stored = await getConversation(
            apiClient,
            adminCredentials.apiKeyHeader,
            conversationId
          );
          expect(
            stored.events?.filter(({ type }) => type === TimelineEventType.userMessage)
          ).toHaveLength(2);
        });
      }
    );

    apiTest(
      'declines a tool confirmation instead of pausing, and reports it next to the answer',
      async ({ apiClient }) => {
        setupAgentCallToolThenAnswer({
          proxy: llmProxy,
          title: 'Message HITL title',
          toolName: HITL_TOOL_ID,
          toolArg: {},
          response: 'I could not run the tool without your confirmation.',
        });

        const res = await postChatMessage(apiClient, adminCredentials.apiKeyHeader, {
          message: 'run the tool',
          agent_id: HITL_AGENT_ID,
        });
        expect(res).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const body = res.body as ChatMessageResponse;
        conversationIds.add(body.conversation_id);
        expect(body.answer).toBe('I could not run the tool without your confirmation.');
        expect(body.declined_prompts).toStrictEqual([
          { tool_id: HITL_TOOL_ID, message: expect.stringContaining('non-interactive mode') },
        ]);

        // The run finished with an answer: it did not pause on the prompt.
        const stored = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          body.conversation_id
        );
        const terminated = (stored.events ?? []).filter(
          ({ type }) => type === TimelineEventType.executionTerminated
        );
        expect(terminated).toHaveLength(1);
        const { outcome } = terminated[0].data as { outcome: ExecutionOutcome };
        expect(outcome.type).toBe('responded');

        // The declined call is on the timeline as a tool call whose result is the tagged error.
        const toolCallSteps = (stored.events ?? [])
          .filter(({ type }) => type === TimelineEventType.executionStep)
          .map((event) => (event.data as { step: ConversationRoundStep }).step)
          .filter(isToolCallStep);
        expect(toolCallSteps.map(({ tool_id: toolId }) => toolId)).toStrictEqual([HITL_TOOL_ID]);
        expect(toolCallSteps[0].results).toHaveLength(1);
        expect(toolCallSteps[0].results[0]).toMatchObject({
          type: ToolResultType.error,
          data: { metadata: { declined_reason: NON_INTERACTIVE_DECLINED_REASON } },
        });
      }
    );

    apiTest('answers 404 for an unknown agent', async ({ apiClient }) => {
      const requestsBefore = llmProxy.interceptedRequests.length;

      const res = await postChatMessage(apiClient, adminCredentials.apiKeyHeader, {
        message: 'hello',
        agent_id: UNKNOWN_AGENT_ID,
      });

      // An agent the caller cannot use is masked as a missing conversation, the same way the
      // conversation APIs report it, so only the status and the "not found" wording are stable.
      expect(res).toHaveStatusCode(404);
      const message = String((res.body as { message?: string }).message);
      expect(message).toContain('not found');
      expect(llmProxy.interceptedRequests).toHaveLength(requestsBefore);

      // The user message is stored before the agent is resolved (as on every converse route), and
      // the masking hides that conversation from the list API too; the message names it, so track
      // it from there for cleanup.
      const [orphanId] = message.match(UUID_PATTERN) ?? [];
      if (orphanId) {
        conversationIds.add(orphanId);
      }
    });

    apiTest(
      'answers 404 for an unknown conversation_id without creating a conversation',
      async ({ apiClient }) => {
        const unknownConversationId = '00000000-0000-4000-8000-00000000c1a1';
        const requestsBefore = llmProxy.interceptedRequests.length;

        const res = await postChatMessage(apiClient, adminCredentials.apiKeyHeader, {
          message: 'hello',
          conversation_id: unknownConversationId,
        });

        expect(res).toHaveStatusCode(404);
        expect(String((res.body as { message?: string }).message)).toContain(unknownConversationId);
        // Nothing ran, and no conversation was created under the typo'd id.
        expect(llmProxy.interceptedRequests).toHaveLength(requestsBefore);
        const lookup = await apiClient.get(
          `${API_AGENT_BUILDER}/conversations/${unknownConversationId}`,
          { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
        );
        expect(lookup).toHaveStatusCode(404);
      }
    );

    apiTest('rejects requests outside the minimal shape with 400', async ({ apiClient }) => {
      const requestsBefore = llmProxy.interceptedRequests.length;

      for (const body of [
        {},
        { message: '' },
        { message: 'hello', conversation_id: 'not-a-uuid' },
        { message: 'hello', attachments: [{ type: 'text', data: { content: 'x' } }] },
        { message: 'hello', connector_id: connectorId },
        { message: 'hello', _execution_mode: 'local' },
      ]) {
        const res = await postChatMessage(apiClient, adminCredentials.apiKeyHeader, body);
        expect(res, JSON.stringify(body)).toHaveStatusCode(400);
      }

      expect(llmProxy.interceptedRequests).toHaveLength(requestsBefore);
    });
  }
);
