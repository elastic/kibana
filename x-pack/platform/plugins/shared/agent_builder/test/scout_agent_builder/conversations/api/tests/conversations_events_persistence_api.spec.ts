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
import type { TimelineEvent } from '@kbn/agent-builder-common';
import { CONVERSATION_SCHEMA_VERSION, TimelineEventType } from '@kbn/agent-builder-common';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import type {
  CreateConversationResponse,
  GetConversationResponse,
} from '../../../../../common/http_api/conversations';
import {
  apiTest,
  API_AGENT_BUILDER,
  CHAT_CONVERSATIONS_INDEX,
  getConversation,
  postConverse,
} from '../fixtures';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;

// The three events every completed round projects to, in stored order.
const ROUND_DERIVED_EVENT_TYPES = [
  TimelineEventType.userMessage,
  TimelineEventType.executionStarted,
  TimelineEventType.executionTerminated,
];

/**
 * End-to-end assertions for the events-persistence contract. These read the raw `_source`
 * directly (the one thing the in-memory CI round-trip check cannot), so a write path that
 * fails to persist `events` / `schema_version` is caught here.
 *
 * `.chat-conversations` is a restricted system index, so tests never write to it directly —
 * conversations are created through the public API and rounds through `converse`.
 */
apiTest.describe(
  'Agent Builder — conversations events persistence',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${CONVERSATIONS_PATH}/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    apiTest(
      'newly created conversations are stored events-native (schema_version + empty events on _source, matched by GET)',
      async ({ asAdmin, esClient }) => {
        const createRes = await asAdmin.post(CONVERSATIONS_PATH, {
          body: { title: 'Events-native create' },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const created = createRes.body as CreateConversationResponse;
        conversationIds.push(created.id);

        // Raw _source: an empty conversation is still stamped events-native, with an empty projection.
        const rawDoc = await esClient.get<{
          schema_version?: number;
          events?: TimelineEvent[];
        }>({
          index: CHAT_CONVERSATIONS_INDEX,
          id: created.id,
        });
        expect(rawDoc._source?.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(rawDoc._source?.events).toStrictEqual([]);

        // GET surface lifts `schema_version` onto the response and reflects the stored events.
        const getRes = await asAdmin.get(
          `${CONVERSATIONS_PATH}/${encodeURIComponent(created.id)}`,
          { responseType: 'json' }
        );
        expect(getRes).toHaveStatusCode(200);
        const fetched = getRes.body as GetConversationResponse;
        expect(fetched.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(fetched.events).toStrictEqual([]);
      }
    );

    apiTest(
      'a completed round is persisted as a stored events projection that GET serves verbatim',
      async ({ apiClient, esClient }) => {
        // A single real round through `converse` drives the production write path
        // (upsertRound -> reconcile -> toEs -> storage.index).
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Events-native round',
          response: 'ack',
        });
        const converseRes = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: 'hello from integration', connector_id: connectorId },
          'local'
        );
        expect(converseRes).toHaveStatusCode(200);
        const conversationId = (converseRes.body as { conversation_id: string }).conversation_id;
        conversationIds.push(conversationId);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        // Raw _source: the write path persisted the projection, it is not derived on read.
        const rawDoc = await esClient.get<{
          schema_version?: number;
          events?: TimelineEvent[];
        }>({
          index: CHAT_CONVERSATIONS_INDEX,
          id: conversationId,
        });
        expect(rawDoc._source?.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        const storedEvents = rawDoc._source?.events ?? [];
        expect(storedEvents.map((event) => event.type)).toStrictEqual(ROUND_DERIVED_EVENT_TYPES);

        // GET serves the stored projection verbatim for an events-native doc.
        const fetched = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(fetched.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(fetched.events).toStrictEqual(storedEvents);
        expect(fetched.rounds).toHaveLength(1);
      }
    );
  }
);
