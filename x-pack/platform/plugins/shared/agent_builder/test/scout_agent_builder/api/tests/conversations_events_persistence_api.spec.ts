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
 * End-to-end assertions for the events-persistence contract (see Pierre's
 * PR review). Two things need to hold on real infrastructure, not just unit
 * tests:
 *   1. New conversations land on disk as events-native
 *      (`schema_version >= 1`, `events` present).
 *   2. GET serves the stored events projection verbatim for events-native
 *      docs — a `fromEs` bug that overwrites stored events with a fresh
 *      derivation would silently pass every in-memory test hooked after
 *      `fromEs`, but is caught here by comparing the API response to the
 *      raw `_source`.
 *
 * We seed the non-empty projection directly via `esClient.index` (rather
 * than driving a real converse round via the LLM proxy) so the spec has
 * no connector setup and stays a focused persistence test.
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

        // Raw _source assertion — closes the in-memory "fromEs overwrites
        // stored events with a fresh derivation" hole. CI's verifyRoundTrip
        // hook runs after `fromEs`, so it cannot catch that bug; a raw doc
        // read can.
        const rawDoc = await esClient.get<{
          schema_version?: number;
          events?: TimelineEvent[];
        }>({
          index: CHAT_CONVERSATIONS_INDEX,
          id: created.id,
        });
        expect(rawDoc._source?.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        // No rounds ⇒ no round-derived events, but the field is present
        // (array, not missing) so subsequent writes stay events-native.
        expect(Array.isArray(rawDoc._source?.events)).toBe(true);
        expect(rawDoc._source?.events).toHaveLength(0);

        // GET surface — `fromEs` lifts `schema_version` onto the response
        // and serves the stored events. On an empty stored projection it
        // falls back to deriving from rounds (also empty), so the API
        // response's `events` matches `_source.events` (both empty).
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
        // Create via API first to get a valid identity (agent_id, user,
        // access_control, space, …) — reusing these ensures the read path's
        // converse-access gate still passes after we overwrite the doc.
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

        // Spread the existing _source to preserve every field the read
        // path needs (space, access_control, user_id/user_name, agent_id,
        // read/pinned/read_only, timestamps, ...), then overlay one round
        // plus its matching round-derived events projection.
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

        // Snapshot what actually landed on disk after the overlay.
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

        // The load-bearing assertion: the API-surfaced `events` array is
        // the stored projection, not a fresh derivation from rounds. This
        // is the events-native read gate proven end to end.
        const getRes = await asAdmin.get(
          `${CONVERSATIONS_PATH}/${encodeURIComponent(created.id)}`,
          { responseType: 'json' }
        );
        expect(getRes).toHaveStatusCode(200);
        const fetched = getRes.body as GetConversationResponse;
        expect(fetched.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
        expect(fetched.events).toStrictEqual(seededRawDoc._source?.events);
        // Rounds are still reconstructed from `conversation_rounds` for API
        // compatibility — rounds remain the source of truth for the shape
        // consumers rely on today.
        expect(fetched.rounds.map((round_) => round_.id)).toStrictEqual([roundId]);
      }
    );
  }
);
