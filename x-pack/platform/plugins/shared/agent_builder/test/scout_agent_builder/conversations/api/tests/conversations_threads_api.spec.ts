/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { AGENT_BUILDER_THREADS_SETTING_ID } from '@kbn/management-settings-ids';
import { TimelineEventType } from '@kbn/agent-builder-common';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { deleteAllConversationsFromEs } from '../../../../scout_agent_builder_shared/lib/conversations_es';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import type {
  CreateConversationResponse,
  CreateThreadResponse,
  GetConversationResponse,
} from '../../../../../common/http_api/conversations';
import { chatApiPath } from '../../../../../common/constants';
import { apiTest, API_AGENT_BUILDER, INTERNAL_AGENT_BUILDER } from '../fixtures';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;
const CONVERSATION_PATH = (id: string) => `${CONVERSATIONS_PATH}/${encodeURIComponent(id)}`;
const THREAD_PATH = (parentId: string) =>
  `${INTERNAL_AGENT_BUILDER}/conversations/${encodeURIComponent(parentId)}/_thread`;

apiTest.describe(
  'Agent Builder — POST /internal/agent_builder/conversations/{parent_id}/_thread',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let llmProxy: LlmProxy;
    let connectorId: string;
    let parentId: string;

    apiTest.beforeAll(async ({ asAdmin, kbnClient, log }) => {
      await kbnClient.uiSettings.update({ [AGENT_BUILDER_THREADS_SETTING_ID]: true });

      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: 'Parent',
        response: 'Host-1 is down',
      });
      const converse = await asAdmin.post(`${chatApiPath}/converse`, {
        body: { connector_id: connectorId, input: 'What is wrong with host-1?' },
        responseType: 'json',
      });
      expect(converse).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      parentId = (converse.body as GetConversationResponse).id;
    });

    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      await deleteAllConversationsFromEs(esClient);
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
      await kbnClient.uiSettings.unset(AGENT_BUILDER_THREADS_SETTING_ID);
    });

    apiTest(
      'creates an empty thread with the parent history, and records it on the parent',
      async ({ asAdmin }) => {
        const threadId = uuidv4();

        const created = await asAdmin.post(THREAD_PATH(parentId), {
          body: { client_thread_id: threadId, title: 'Side question' },
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);

        const { thread_id: createdId, execution_id: executionId } =
          created.body as CreateThreadResponse;
        expect(createdId).toBe(threadId);
        expect(executionId).toBeUndefined();

        const thread = await asAdmin.get(CONVERSATION_PATH(threadId), { responseType: 'json' });
        expect(thread).toHaveStatusCode(200);

        const { events, parent_conversation: parentLink } = thread.body as GetConversationResponse;
        expect(events?.[0].type).toBe(TimelineEventType.threadStarted);
        expect(events?.some(({ type }) => type === TimelineEventType.userMessage)).toBe(false);
        expect(parentLink).toStrictEqual({ id: parentId, relation: 'thread' });

        const parent = await asAdmin.get(CONVERSATION_PATH(parentId), { responseType: 'json' });
        const threadCreated = (parent.body as GetConversationResponse).events?.find(
          ({ type, data }) =>
            type === TimelineEventType.threadCreated &&
            (data as { thread_id: string }).thread_id === threadId
        );
        expect((threadCreated?.data as { title: string } | undefined)?.title).toBe('Side question');
      }
    );

    apiTest('a resend returns the same thread and records it once', async ({ asAdmin }) => {
      const threadId = uuidv4();
      const body = { client_thread_id: threadId };

      expect(await asAdmin.post(THREAD_PATH(parentId), { body })).toHaveStatusCode(200);
      const resent = await asAdmin.post(THREAD_PATH(parentId), { body, responseType: 'json' });
      expect(resent).toHaveStatusCode(200);
      expect((resent.body as CreateThreadResponse).thread_id).toBe(threadId);

      const parent = await asAdmin.get(CONVERSATION_PATH(parentId), { responseType: 'json' });
      const recorded = (parent.body as GetConversationResponse).events?.filter(
        ({ type, data }) =>
          type === TimelineEventType.threadCreated &&
          (data as { thread_id: string }).thread_id === threadId
      );
      expect(recorded).toHaveLength(1);
    });

    apiTest('starts the first run on the highlight', async ({ asAdmin }) => {
      const threadId = uuidv4();
      await setupAgentDirectAnswer({ proxy: llmProxy, title: 'Thread', response: 'Disk full' });

      const created = await asAdmin.post(THREAD_PATH(parentId), {
        body: {
          client_thread_id: threadId,
          highlight: { text: 'Why is the disk full?' },
          connector_id: connectorId,
        },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      expect((created.body as CreateThreadResponse).execution_id).toBeDefined();

      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await expect
        .poll(async () => {
          const thread = await asAdmin.get(CONVERSATION_PATH(threadId), { responseType: 'json' });
          return (thread.body as GetConversationResponse).events?.some(
            ({ type }) => type === TimelineEventType.executionTerminated
          );
        })
        .toBe(true);
    });

    apiTest('creates a thread of a parent without events', async ({ asAdmin }) => {
      const empty = await asAdmin.post(CONVERSATIONS_PATH, { body: {}, responseType: 'json' });
      const emptyId = (empty.body as CreateConversationResponse).id;

      const created = await asAdmin.post(THREAD_PATH(emptyId), {
        body: { client_thread_id: uuidv4() },
      });
      expect(created).toHaveStatusCode(200);
    });

    apiTest('refuses to start a thread from a thread', async ({ asAdmin }) => {
      const threadId = uuidv4();
      await asAdmin.post(THREAD_PATH(parentId), { body: { client_thread_id: threadId } });

      const nested = await asAdmin.post(THREAD_PATH(threadId), {
        body: { client_thread_id: uuidv4() },
      });
      expect(nested).toHaveStatusCode(400);
    });

    apiTest('answers 404 for a missing parent', async ({ asAdmin }) => {
      const missing = await asAdmin.post(THREAD_PATH(uuidv4()), {
        body: { client_thread_id: uuidv4() },
      });
      expect(missing).toHaveStatusCode(404);
    });

    apiTest(
      'answers 400 for a cut at an event that is not a message or an end',
      async ({ asAdmin }) => {
        const badCut = await asAdmin.post(THREAD_PATH(parentId), {
          body: { client_thread_id: uuidv4(), cut_event_id: 'not-an-event' },
        });
        expect(badCut).toHaveStatusCode(400);
      }
    );

    apiTest('answers 404 while the threads setting is off', async ({ asAdmin, kbnClient }) => {
      await kbnClient.uiSettings.update({ [AGENT_BUILDER_THREADS_SETTING_ID]: false });

      try {
        const off = await asAdmin.post(THREAD_PATH(parentId), {
          body: { client_thread_id: uuidv4() },
        });
        expect(off).toHaveStatusCode(404);
      } finally {
        await kbnClient.uiSettings.update({ [AGENT_BUILDER_THREADS_SETTING_ID]: true });
      }
    });
  }
);
