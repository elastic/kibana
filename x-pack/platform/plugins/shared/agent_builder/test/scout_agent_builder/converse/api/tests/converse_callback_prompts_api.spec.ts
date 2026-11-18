/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  AgentBuilderErrorCode,
  ConversationOriginType,
  ConversationRoundStatus,
  isRoundCompleteEvent,
  type SurfacePayload,
} from '@kbn/agent-builder-common';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type {
  ChatCallbackAcceptedResponse,
  ChatCallbackEventResponse,
  ChatCallbackResponse,
} from '../../../../../common/http_api/chat_callback';
import {
  createAgentViaKbn,
  deleteAgentViaKbn,
} from '../../../../scout_agent_builder_shared/lib/agents_kbn';
import { CallbackTestServer } from '../../../../scout_agent_builder_shared/lib/callback_test_server';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentCallTool,
  setupAgentDirectAnswer,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { createToolViaKbn } from '../../../../scout_agent_builder_shared/lib/tools_kbn';
import {
  apiTest,
  API_AGENT_BUILDER,
  COMMON_HEADERS,
  INTERNAL_AGENT_BUILDER,
  getConversation,
  postConverse,
} from '../fixtures';

const INTERNAL_API_VERSION = '1';

// Executions outlive the suite, so fixed keys and ids would replay a previous run's executions.
const RUN_ID = randomUUID();
/** A tool that asks for confirmation before every call, and an agent that can use it. */
const HITL_TOOL_ID = `callback-prompts-tool-${RUN_ID}`;
const HITL_AGENT_ID = `callback-prompts-agent-${RUN_ID}`;

type CallbackEvent = ChatCallbackEventResponse['event'];

interface SlackButton {
  type: string;
  action_id?: string;
  value?: string;
}

/** The buttons of the payload's `actions` blocks, as Slack would send them back on a click. */
const buttonsOf = (payload: SurfacePayload | undefined): SlackButton[] =>
  (payload?.blocks ?? []).flatMap((block) =>
    block.type === 'actions' ? (block.elements as SlackButton[]) : []
  );

apiTest.describe(
  'Agent Builder - converse callback API: prompts',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let adminInteractiveCookieHeader: Record<string, string>;
    let llmProxy: LlmProxy;
    let connectorId: string;
    let callbackServer: CallbackTestServer;
    let callbackServerUrl: string;
    const conversationIds = new Set<string>();

    apiTest.beforeAll(async ({ requestAuth, samlAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminInteractiveCookieHeader = cookieHeader;

      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;

      callbackServer = new CallbackTestServer();
      callbackServerUrl = await callbackServer.start();

      await createToolViaKbn(kbnClient, {
        id: HITL_TOOL_ID,
        type: 'esql',
        description: 'A tool that always asks for confirmation',
        tags: ['test'],
        configuration: { query: 'ROW answer = 42', params: {} },
        confirmation: { askUser: 'always' },
      });
      await createAgentViaKbn(kbnClient, { id: HITL_AGENT_ID, name: 'Callback prompts agent' });
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      await Promise.all(
        [...conversationIds].map((conversationId) =>
          asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`)
        )
      );
      await deleteAgentViaKbn(kbnClient, HITL_AGENT_ID);
      await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(HITL_TOOL_ID)}`);

      await callbackServer.stop();
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    const internalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminInteractiveCookieHeader,
      'elastic-api-version': INTERNAL_API_VERSION,
    });

    const isEventPayload = (payload: ChatCallbackResponse): payload is ChatCallbackEventResponse =>
      'event' in payload;

    /** Consumes callback requests until every predicate matched one, returning the event payloads. */
    const collectEventsUntil = async (
      ...predicates: Array<(event: CallbackEvent) => boolean>
    ): Promise<ChatCallbackEventResponse[]> => {
      const payloads: ChatCallbackEventResponse[] = [];
      const matchedAll = () =>
        predicates.every((predicate) => payloads.some(({ event }) => predicate(event)));

      while (!matchedAll()) {
        const { body } = await callbackServer.waitForRequest();

        if (isEventPayload(body as ChatCallbackResponse)) {
          payloads.push(body as ChatCallbackEventResponse);
        }
      }

      return payloads;
    };

    const isPausedRound = (event: CallbackEvent) =>
      isRoundCompleteEvent(event) &&
      event.data.round.status === ConversationRoundStatus.awaitingPrompt;

    const isCompletedRound = (event: CallbackEvent) =>
      isRoundCompleteEvent(event) && event.data.round.status === ConversationRoundStatus.completed;

    const isPromptResolved = (event: CallbackEvent) => event.type === 'prompt_resolved';

    const findEvent = (
      payloads: ChatCallbackEventResponse[],
      predicate: (event: CallbackEvent) => boolean
    ) => payloads.find(({ event }) => predicate(event));

    const postCallback = (
      apiClient: Parameters<typeof postConverse>[0],
      origin: { type: ConversationOriginType; external_conversation_id: string },
      key: string,
      body: Record<string, unknown>
    ) =>
      apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
        headers: internalHeaders(),
        body: {
          agent_id: HITL_AGENT_ID,
          connector_id: connectorId,
          execution_idempotency_key: `Ev-prompts-${key}-${RUN_ID}`,
          origin,
          callback: { url: `${callbackServerUrl}/callback?token=${key}` },
          ...body,
        },
        responseType: 'json',
      });

    /** Starts a Slack thread whose first round pauses on the tool's confirmation. */
    const pauseOnConfirmation = async (
      apiClient: Parameters<typeof postConverse>[0],
      thread: string
    ) => {
      const origin = {
        type: ConversationOriginType.Slack,
        external_conversation_id: `team:T123/channel:C123/thread:${thread}-${RUN_ID}`,
      };

      setupAgentCallTool({
        proxy: llmProxy,
        title: `Prompts ${thread}`,
        toolName: HITL_TOOL_ID,
        toolArg: {},
      });

      const response = await postCallback(apiClient, origin, `${thread}-pause`, {
        input: 'run the tool',
      });

      expect(response).toHaveStatusCode(202);

      const accepted = response.body as ChatCallbackAcceptedResponse;
      conversationIds.add(accepted.conversation_id);

      const paused = findEvent(await collectEventsUntil(isPausedRound), isPausedRound);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const surfacePayload =
        paused && isRoundCompleteEvent(paused.event) ? paused.event.surface_payload : undefined;

      return { origin, accepted, buttons: buttonsOf(surfacePayload) };
    };

    apiTest(
      'asks a confirmation with buttons, and resumes when one is sent back',
      async ({ apiClient }) => {
        const { origin, accepted, buttons } = await pauseOnConfirmation(apiClient, 'click');

        expect(buttons.map(({ action_id: actionId }) => actionId)).toStrictEqual([
          'prompt_response:0',
          'prompt_response:1',
        ]);

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: 'The answer is 42',
        });

        const resumed = await postCallback(apiClient, origin, 'click-resume', {
          prompt_selections: [buttons[0].value],
        });

        expect(resumed).toHaveStatusCode(202);

        const payloads = await collectEventsUntil(isPromptResolved, isCompletedRound);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const resolved = findEvent(payloads, isPromptResolved);
        const completed = findEvent(payloads, isCompletedRound);

        expect(resolved?.execution_id).toBe(accepted.execution_id);
        expect(resolved?.idempotency_key).toBe(`${accepted.execution_id}:prompt_resolved`);
        expect(
          buttonsOf(
            resolved && 'surface_payload' in resolved.event
              ? resolved.event.surface_payload
              : undefined
          )
        ).toHaveLength(0);
        expect(completed?.execution_id).toBe(
          (resumed.body as ChatCallbackAcceptedResponse).execution_id
        );
      }
    );

    apiTest('reads a reply in the thread as the answer to the prompt', async ({ apiClient }) => {
      const { origin } = await pauseOnConfirmation(apiClient, 'reply');

      const unclear = await postCallback(apiClient, origin, 'reply-unclear', {
        input: 'what does it do?',
      });

      expect(unclear).toHaveStatusCode(409);
      expect((unclear.body as { attributes: { code: string } }).attributes.code).toBe(
        AgentBuilderErrorCode.conversationPaused
      );

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        continueConversation: true,
        response: 'The answer is 42',
      });

      const resumed = await postCallback(apiClient, origin, 'reply-resume', { input: 'yes' });

      expect(resumed).toHaveStatusCode(202);

      const payloads = await collectEventsUntil(isPromptResolved, isCompletedRound);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      expect(findEvent(payloads, isCompletedRound)).toBeDefined();
    });

    apiTest(
      'tells the callback when the prompt is answered outside the thread',
      async ({ apiClient }) => {
        const { accepted } = await pauseOnConfirmation(apiClient, 'kibana');

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: 'The answer is 42',
        });

        const { rounds } = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          accepted.conversation_id
        );
        const [prompt] = rounds[0].pending_prompts ?? [];

        const resumed = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            agent_id: HITL_AGENT_ID,
            connector_id: connectorId,
            conversation_id: accepted.conversation_id,
            prompts: { [prompt.id]: { allow: true } },
          },
          'local'
        );

        expect(resumed).toHaveStatusCode(200);

        const [resolved] = await collectEventsUntil(isPromptResolved);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(resolved.execution_id).toBe(accepted.execution_id);
        expect(resolved.event).toMatchObject({
          type: 'prompt_resolved',
          data: { responses: { [prompt.id]: { allow: true } } },
        });
      }
    );
  }
);
