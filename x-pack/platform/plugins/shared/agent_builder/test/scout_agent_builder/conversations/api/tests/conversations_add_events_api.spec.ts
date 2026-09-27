/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  AddConversationEventsResponse,
  CreateConversationResponse,
  GetConversationResponse,
} from '../../../../../common/http_api/conversations';
import { deleteAllConversationsFromEs } from '../../../../scout_agent_builder_shared/lib/conversations_es';
import { apiTest, API_AGENT_BUILDER, ELASTIC_API_VERSION } from '../fixtures';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;
const CONVERSATION_PATH = (id: string) => `${CONVERSATIONS_PATH}/${encodeURIComponent(id)}`;
const ADD_EVENTS_PATH = (id: string) => `${CONVERSATION_PATH(id)}/_add_events`;
const ADD_EVENTS_HEADERS = { 'elastic-api-version': ELASTIC_API_VERSION };

const TEXT_NOTE_EVENT_TYPE = 'text_note';
const NOTE_EVENT = { type: TEXT_NOTE_EVENT_TYPE, data: { text: 'test note' } };

apiTest.describe(
  'Agent Builder — POST /conversations/{id}/_add_events',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let conversationId: string;

    apiTest.beforeAll(async ({ asAdmin }) => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, { body: {}, responseType: 'json' });
      expect(res).toHaveStatusCode(200);
      conversationId = (res.body as CreateConversationResponse).id;
    });

    apiTest.afterAll(async ({ esClient }) => {
      await deleteAllConversationsFromEs(esClient);
    });

    // ── Happy path ──────────────────────────────────────────────────────────────

    apiTest(
      'returns 200 and the materialized event with server-assigned fields',
      async ({ asAdmin }) => {
        const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
          body: { events: [NOTE_EVENT] },
          headers: ADD_EVENTS_HEADERS,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        const { events } = res.body as AddConversationEventsResponse;
        expect(events).toHaveLength(1);
        const [event] = events;
        expect(event.type).toBe(TEXT_NOTE_EVENT_TYPE);
        expect((event.data as { text: string }).text).toBe('test note');
        // Server assigns id — must be uuid-shaped and must not contain '::'
        // (the delimiter used by round-derived event ids; a collision would cause
        // the event to be silently overwritten on the next round write)
        expect(typeof event.id).toBe('string');
        expect(event.id).not.toContain('::');
        expect(event.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
        expect(typeof event.created_at).toBe('string');
        expect(Number.isNaN(new Date(event.created_at).getTime())).toBe(false);
        expect(event.actor.type).toBe('user');
      }
    );

    apiTest(
      'event persists on GET and does not affect the rounds projection',
      async ({ asAdmin }) => {
        const postRes = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
          body: { events: [{ type: TEXT_NOTE_EVENT_TYPE, data: { text: 'round-trip note' } }] },
          headers: ADD_EVENTS_HEADERS,
          responseType: 'json',
        });
        expect(postRes).toHaveStatusCode(200);
        const appendedId = (postRes.body as AddConversationEventsResponse).events[0].id;

        const getRes = await asAdmin.get(CONVERSATION_PATH(conversationId), {
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        const conversation = getRes.body as GetConversationResponse;

        // The event is stored and round-trips
        const found = (conversation.events ?? []).some((e) => e.id === appendedId);
        expect(found).toBe(true);

        // eventsToRounds skips events with no execution_id — custom events must not perturb rounds
        expect(conversation.rounds).toHaveLength(0);
      }
    );

    apiTest('batch append: two events → two distinct ids in response', async ({ asAdmin }) => {
      const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
        body: {
          events: [
            { type: TEXT_NOTE_EVENT_TYPE, data: { text: 'note A' } },
            { type: TEXT_NOTE_EVENT_TYPE, data: { text: 'note B' } },
          ],
        },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      const { events } = res.body as AddConversationEventsResponse;
      expect(events).toHaveLength(2);
      expect(events[0].id).not.toBe(events[1].id);
    });

    apiTest(
      'batch atomicity: a bad event in the batch rejects the whole request and appends nothing',
      async ({ asAdmin }) => {
        // Second event has an invalid payload (missing required text); full batch must be rejected.
        const postRes = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
          body: {
            events: [
              { type: TEXT_NOTE_EVENT_TYPE, data: { text: 'valid note' } },
              { type: TEXT_NOTE_EVENT_TYPE, data: {} }, // missing required text
            ],
          },
          headers: ADD_EVENTS_HEADERS,
          responseType: 'json',
        });
        expect(postRes).toHaveStatusCode(400);

        // Neither event should have been appended
        const getRes = await asAdmin.get(CONVERSATION_PATH(conversationId), {
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        const conversation = getRes.body as GetConversationResponse;
        const texts = (conversation.events ?? [])
          .filter((e) => e.type === TEXT_NOTE_EVENT_TYPE)
          .map((e) => (e.data as { text?: string }).text);
        expect(texts).not.toContain('valid note');
      }
    );

    // ── Negative paths ───────────────────────────────────────────────────────────

    apiTest('returns 404 for a conversation that does not exist', async ({ asAdmin }) => {
      const res = await asAdmin.post(ADD_EVENTS_PATH('00000000-0000-0000-0000-000000000000'), {
        body: { events: [NOTE_EVENT] },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(404);
    });

    apiTest('returns 400 for an unregistered event type', async ({ asAdmin }) => {
      const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
        body: { events: [{ type: 'unknown.nonexistent_type', data: {} }] },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
    });

    apiTest('returns 400 for a built-in (internal) event type', async ({ asAdmin }) => {
      // user_message is a built-in lifecycle type registered with internal: true
      const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
        body: { events: [{ type: 'user_message', data: {} }] },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
    });

    apiTest('returns 400 when events array is empty', async ({ asAdmin }) => {
      const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
        body: { events: [] },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
    });

    apiTest('returns 400 when actor is supplied in an event (unknown key)', async ({ asAdmin }) => {
      const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
        body: {
          events: [
            {
              type: TEXT_NOTE_EVENT_TYPE,
              data: { text: 'hi' },
              actor: { type: 'user', id: 'u_other' },
            },
          ],
        },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
    });

    apiTest('returns 400 when id is supplied on an event (unknown key)', async ({ asAdmin }) => {
      const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
        body: {
          events: [{ type: TEXT_NOTE_EVENT_TYPE, data: { text: 'hi' }, id: 'caller-supplied-id' }],
        },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
    });

    apiTest('returns 400 when event is invalid for custom schema', async ({ asAdmin }) => {
      const res = await asAdmin.post(ADD_EVENTS_PATH(conversationId), {
        body: {
          events: [
            {
              type: TEXT_NOTE_EVENT_TYPE,
              data: {
                // text_note event limits text to 1000 characters
                text: 'a'.repeat(2000),
              },
            },
          ],
        },
        headers: ADD_EVENTS_HEADERS,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
    });
  }
);
