/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  ConversationAccessControlMode,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { CreateConversationResponse } from '../../../../../common/http_api/conversations';
import { apiTest, API_AGENT_BUILDER, CHAT_CONVERSATIONS_INDEX } from '../fixtures';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;

apiTest.describe(
  'Agent Builder — POST /conversations',
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
      'returns 200 with correct default shape when called with an empty body',
      async ({ asAdmin }) => {
        const res = await asAdmin.post(CONVERSATIONS_PATH, {
          body: {},
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        const conversation = res.body as CreateConversationResponse;
        expect(typeof conversation.id).toBe('string');
        expect(conversation.title).toBe(DEFAULT_CONVERSATION_TITLE);
        expect(conversation.agent_id).toBeDefined();
        expect(Array.isArray(conversation.rounds)).toBe(true);
        expect(conversation.rounds).toHaveLength(0);
        expect(conversation.created_at).toBeDefined();
        expect(conversation.updated_at).toBeDefined();
        expect(conversation.user).toBeDefined();
        expect(conversation.permissions).toBeDefined();
        expect(typeof conversation.permissions.rename).toBe('boolean');
        expect(typeof conversation.permissions.delete).toBe('boolean');
      }
    );

    apiTest('stores a custom title when provided', async ({ asAdmin }) => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { title: 'My custom title' },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect((res.body as CreateConversationResponse).title).toBe('My custom title');
    });

    apiTest('stores access_control when provided', async ({ asAdmin }) => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { access_control: { access_mode: ConversationAccessControlMode.Public } },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect((res.body as CreateConversationResponse).access_control?.access_mode).toBe(
        ConversationAccessControlMode.Public
      );

      const getRes = await asAdmin.get(
        `${CONVERSATIONS_PATH}/${encodeURIComponent((res.body as CreateConversationResponse).id)}`,
        { responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(200);
      expect((getRes.body as CreateConversationResponse).access_control?.access_mode).toBe(
        ConversationAccessControlMode.Public
      );
    });

    apiTest('uses the client-supplied conversation_id when provided', async ({ asAdmin }) => {
      const id = randomUUID();
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { conversation_id: id },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect((res.body as CreateConversationResponse).id).toBe(id);
    });

    apiTest(
      'the created conversation is retrievable via GET /conversations/:id',
      async ({ asAdmin }) => {
        const createRes = await asAdmin.post(CONVERSATIONS_PATH, {
          body: { title: 'Retrievable conversation' },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const id = (createRes.body as CreateConversationResponse).id;

        const getRes = await asAdmin.get(`${CONVERSATIONS_PATH}/${encodeURIComponent(id)}`, {
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        const conversation = getRes.body as CreateConversationResponse;
        expect(conversation.id).toBe(id);
        expect(conversation.title).toBe('Retrievable conversation');
        expect(Array.isArray(conversation.rounds)).toBe(true);
      }
    );

    apiTest('the created conversation appears in GET /conversations', async ({ asAdmin }) => {
      const createRes = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { title: 'Listed conversation' },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const id = (createRes.body as CreateConversationResponse).id;

      const listRes = await asAdmin.get(CONVERSATIONS_PATH, { responseType: 'json' });
      expect(listRes).toHaveStatusCode(200);
      const ids = (listRes.body as { results: Array<{ id: string }> }).results.map((c) => c.id);
      expect(ids).toContain(id);
    });

    apiTest('stores access_control entries when provided', async ({ asAdmin }) => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: {
          access_control: {
            access_mode: ConversationAccessControlMode.Private,
            entries: [{ type: 'user', id: 'u_test_uid', role: 'member' }],
          },
        },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      const conversation = res.body as CreateConversationResponse;
      expect(conversation.access_control?.access_mode).toBe(ConversationAccessControlMode.Private);
      expect(Array.isArray(conversation.access_control?.entries)).toBe(true);
      expect(conversation.access_control?.entries).toHaveLength(1);
      expect(conversation.access_control?.entries?.[0].id).toBe('u_test_uid');
    });

    apiTest(
      'returns 400 when entries are supplied with access_mode public',
      async ({ asAdmin }) => {
        const res = await asAdmin.post(CONVERSATIONS_PATH, {
          body: {
            access_control: {
              access_mode: ConversationAccessControlMode.Public,
              entries: [{ type: 'user', id: 'u_test_uid', role: 'member' }],
            },
          },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(400);
      }
    );

    apiTest('returns 404 when agent_id does not exist', async ({ asAdmin }) => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { agent_id: 'non-existent-agent-id' },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(404);
    });

    apiTest('returns 409 when the supplied conversation_id already exists', async ({ asAdmin }) => {
      const id = randomUUID();

      const first = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { conversation_id: id },
        responseType: 'json',
      });
      expect(first).toHaveStatusCode(200);

      const second = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { conversation_id: id },
        responseType: 'json',
      });
      expect(second).toHaveStatusCode(409);
    });

    apiTest('returns 400 when conversation_id is not a valid UUID', async ({ asAdmin }) => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { conversation_id: 'not-a-uuid' },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
    });
  }
);
