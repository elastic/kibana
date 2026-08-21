/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEvent } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  CreateConversationResponse,
  GetConversationResponse,
} from '../../../../common/http_api/conversations';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, CHAT_CONVERSATIONS_INDEX } from '../fixtures/constants';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;

/**
 * End-to-end assertions for the events-persistence contract.
 */
apiTest.describe(
  'Agent Builder — conversations events persistence',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    apiTest.afterAll(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    apiTest(
      'newly created conversations are stored events-native (schema_version + events on _source, matched by GET)',
      async ({ asAdmin, esClient }) => {
        const createRes = await asAdmin.post(CONVERSATIONS_PATH, {
          body: { title: 'Events-native create' },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const created = createRes.body as CreateConversationResponse;

        const rawDoc = await esClient.get<{
          schema_version?: number;
          events?: TimelineEvent[];
        }>({
          index: CHAT_CONVERSATIONS_INDEX,
          id: created.id,
        });
        expect(rawDoc._source?.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(Array.isArray(rawDoc._source?.events)).toBe(true);
        expect(rawDoc._source?.events).toHaveLength(0);

        const getRes = await asAdmin.get(
          `${CONVERSATIONS_PATH}/${encodeURIComponent(created.id)}`,
          { responseType: 'json' }
        );
        expect(getRes).toHaveStatusCode(200);
        const fetched = getRes.body as GetConversationResponse;
        expect(fetched.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(fetched.events).toStrictEqual(rawDoc._source?.events ?? []);
      }
    );

    apiTest(
      'GET serves the stored events projection verbatim for events-native docs with a round',
      async ({ asAdmin, esClient }) => {
        const createRes = await asAdmin.post(CONVERSATIONS_PATH, {
          body: { title: 'Events-native seed' },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const created = createRes.body as CreateConversationResponse;

        const initialRawDoc = await esClient.get<Record<string, unknown>>({
          index: CHAT_CONVERSATIONS_INDEX,
          id: created.id,
        });

        const startedAt = new Date().toISOString();
        const endedAt = new Date(new Date(startedAt).getTime() + 5).toISOString();
        const roundId = 'round-integration';
        const executionId = `${roundId}::execution`;
        const userMessageId = `${roundId}::user_message`;

        const round = {
          id: roundId,
          status: ConversationRoundStatus.completed,
          input: { message: 'hello from integration' },
          response: { message: 'ack' },
          steps: [],
          started_at: startedAt,
          time_to_first_token: 1,
          time_to_last_token: 5,
          model_usage: {
            connector_id: 'unknown',
            llm_calls: 1,
            input_tokens: 1,
            output_tokens: 1,
          },
        };

        const seededEvents: TimelineEvent[] = [
          {
            id: userMessageId,
            type: TimelineEventType.userMessage,
            created_at: startedAt,
            actor: {
              type: EventActorType.user,
              id: created.user.id ?? created.user.username ?? 'unknown',
              ...(created.user.username ? { username: created.user.username } : {}),
            },
            data: round.input,
          },
          {
            id: `${roundId}::execution_started`,
            type: TimelineEventType.executionStarted,
            created_at: startedAt,
            actor: { type: EventActorType.agent, id: created.agent_id },
            execution_id: executionId,
            trigger_event_id: userMessageId,
            data: { trigger_type: TimelineTriggerType.userMessage },
          },
          {
            id: `${roundId}::execution_terminated`,
            type: TimelineEventType.executionTerminated,
            created_at: endedAt,
            actor: { type: EventActorType.agent, id: created.agent_id },
            execution_id: executionId,
            trigger_event_id: userMessageId,
            data: {
              steps: [],
              model_usage: round.model_usage,
              time_to_first_token: round.time_to_first_token,
              time_to_last_token: round.time_to_last_token,
              outcome: { type: 'responded', response: round.response },
            },
          },
        ];

        await esClient.index({
          index: CHAT_CONVERSATIONS_INDEX,
          id: created.id,
          document: {
            ...(initialRawDoc._source as Record<string, unknown>),
            conversation_rounds: [round],
            events: seededEvents,
            schema_version: CONVERSATION_SCHEMA_VERSION,
          },
          refresh: 'wait_for',
        });

        const seededRawDoc = await esClient.get<{
          schema_version?: number;
          events?: TimelineEvent[];
        }>({
          index: CHAT_CONVERSATIONS_INDEX,
          id: created.id,
        });
        expect(seededRawDoc._source?.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(seededRawDoc._source?.events?.map((event) => event.id)).toStrictEqual([
          userMessageId,
          `${roundId}::execution_started`,
          `${roundId}::execution_terminated`,
        ]);

        const getRes = await asAdmin.get(
          `${CONVERSATIONS_PATH}/${encodeURIComponent(created.id)}`,
          { responseType: 'json' }
        );
        expect(getRes).toHaveStatusCode(200);
        const fetched = getRes.body as GetConversationResponse;
        expect(fetched.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(fetched.events).toStrictEqual(seededRawDoc._source?.events);
        expect(fetched.rounds.map((round_) => round_.id)).toStrictEqual([roundId]);
      }
    );
  }
);
