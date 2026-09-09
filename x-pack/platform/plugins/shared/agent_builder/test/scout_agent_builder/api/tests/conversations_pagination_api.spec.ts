/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { MAX_CONVERSATIONS_PER_PAGE } from '../../../../common/constants';
import type {
  CreateConversationResponse,
  ListConversationsResponse,
} from '../../../../common/http_api/conversations';
import {
  createAgentViaKbn,
  deleteAgentViaKbn,
} from '../../../scout_agent_builder_shared/lib/agents_kbn';
import { createSystemIndicesEsClient } from '../../../scout_agent_builder_shared/lib/system_indices_es_client';
import { apiTest } from '../fixtures';
import {
  API_AGENT_BUILDER,
  CHAT_CONVERSATIONS_INDEX,
  INTERNAL_AGENT_BUILDER,
} from '../fixtures/constants';

// Use a small per_page so pagination tests don't require 50+ conversations.
const PER_PAGE = 5;
const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;

apiTest.describe(
  'Agent Builder — conversations list pagination API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const agentId = 'pagination-test-agent';
    // IDs of the conversations created in beforeAll, ordered newest→oldest as the
    // API returns them (sort_order=desc by default).
    let conversationIds: string[] = [];
    // ES client authenticated as system_indices_superuser — needed to write/update
    // `.chat-*` system index documents directly (e.g. to remove the `pinned` field).
    let sysEsClient: Client;

    apiTest.beforeAll(async ({ kbnClient, asAdmin, esClient, config }) => {
      sysEsClient = await createSystemIndicesEsClient(esClient, config);
      // Create a dedicated agent so every list request can be filtered to only
      // the conversations created by this suite, regardless of what other tests
      // have left behind.
      await createAgentViaKbn(kbnClient, {
        id: agentId,
        name: 'Pagination Test Agent',
      });

      // Create 7 conversations → with per_page=5 this gives a full page 1 (5)
      // and a partial page 2 (2), which is enough to exercise all page math.
      const ids: string[] = [];
      for (let i = 0; i < 7; i++) {
        const res = await asAdmin.post(CONVERSATIONS_PATH, {
          body: { agent_id: agentId, title: `Pagination test conversation ${i + 1}` },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);
        ids.push((res.body as CreateConversationResponse).id);
      }

      // The API returns results sorted by updated_at desc (newest first).
      // Reverse so conversationIds[0] is the most-recently created (last in the
      // loop → highest updated_at) and conversationIds[6] is the oldest.
      conversationIds = ids.reverse();
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      await deleteAgentViaKbn(kbnClient, agentId);
      await esClient.deleteByQuery({
        index: CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    // -------------------------------------------------------------------------
    // _meta shape
    // -------------------------------------------------------------------------

    apiTest('response includes _meta with total, page, and per_page', async ({ asAdmin }) => {
      const res = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({
          agent_id: agentId,
          per_page: String(PER_PAGE),
        })}`,
        { responseType: 'json' }
      );

      expect(res).toHaveStatusCode(200);
      const body = res.body as ListConversationsResponse;
      expect(typeof body.pagination.total).toBe('number');
      expect(body.pagination.total).toBeGreaterThanOrEqual(7);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.per_page).toBe(PER_PAGE);
    });

    apiTest(
      'defaults to page=1 and per_page=MAX_CONVERSATIONS_PER_PAGE when not provided',
      async ({ asAdmin }) => {
        const res = await asAdmin.get(
          `${CONVERSATIONS_PATH}?${new URLSearchParams({ agent_id: agentId })}`,
          { responseType: 'json' }
        );

        expect(res).toHaveStatusCode(200);
        const body = res.body as ListConversationsResponse;
        expect(body.pagination.page).toBe(1);
        expect(body.pagination.per_page).toBe(MAX_CONVERSATIONS_PER_PAGE);
        // All 7 test conversations fit within the default page size, so they
        // should all be returned in a single page.
        const ids = body.results.map((c) => c.id);
        for (const id of conversationIds) {
          expect(ids).toContain(id);
        }
      }
    );

    // -------------------------------------------------------------------------
    // per_page
    // -------------------------------------------------------------------------

    apiTest('per_page limits the number of results returned', async ({ asAdmin }) => {
      const res = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({
          agent_id: agentId,
          per_page: String(PER_PAGE),
        })}`,
        { responseType: 'json' }
      );

      expect(res).toHaveStatusCode(200);
      expect((res.body as ListConversationsResponse).results).toHaveLength(PER_PAGE);
    });

    apiTest('per_page exceeding the maximum returns 400', async ({ asAdmin }) => {
      const res = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({
          per_page: String(MAX_CONVERSATIONS_PER_PAGE + 1),
        })}`,
        { responseType: 'json' }
      );

      expect(res).toHaveStatusCode(400);
    });

    // -------------------------------------------------------------------------
    // page
    // -------------------------------------------------------------------------

    apiTest('page=2 returns the second page of results', async ({ asAdmin }) => {
      const res = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({
          agent_id: agentId,
          per_page: String(PER_PAGE),
          page: '2',
        })}`,
        { responseType: 'json' }
      );

      expect(res).toHaveStatusCode(200);
      const body = res.body as ListConversationsResponse;
      // 7 conversations ÷ per_page=5 → page 2 has 2 items.
      expect(body.results.length).toBeGreaterThanOrEqual(1);
      expect(body.pagination.page).toBe(2);
    });

    apiTest(
      'pages are non-overlapping and together cover all conversations',
      async ({ asAdmin }) => {
        const page1Res = await asAdmin.get(
          `${CONVERSATIONS_PATH}?${new URLSearchParams({
            agent_id: agentId,
            per_page: String(PER_PAGE),
            page: '1',
          })}`,
          { responseType: 'json' }
        );
        const page2Res = await asAdmin.get(
          `${CONVERSATIONS_PATH}?${new URLSearchParams({
            agent_id: agentId,
            per_page: String(PER_PAGE),
            page: '2',
          })}`,
          { responseType: 'json' }
        );

        expect(page1Res).toHaveStatusCode(200);
        expect(page2Res).toHaveStatusCode(200);

        const page1 = page1Res.body as ListConversationsResponse;
        const page2 = page2Res.body as ListConversationsResponse;

        const page1Ids = new Set(page1.results.map((c) => c.id));
        const page2Ids = new Set(page2.results.map((c) => c.id));

        // No ID appears on both pages.
        for (const id of page2Ids) {
          expect(page1Ids.has(id)).toBe(false);
        }

        // All 7 created IDs are covered across the two pages.
        const allIds = new Set([...page1Ids, ...page2Ids]);
        for (const id of conversationIds) {
          expect(allIds.has(id)).toBe(true);
        }
      }
    );

    apiTest('page * per_page exceeding MAX_RESULT_WINDOW returns 400', async ({ asAdmin }) => {
      // MAX_RESULT_WINDOW = 10_000; page=201 * per_page=50 = 10_050 > 10_000.
      const res = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({
          per_page: '50',
          page: '201',
        })}`,
        { responseType: 'json' }
      );

      expect(res).toHaveStatusCode(400);
    });

    // -------------------------------------------------------------------------
    // pinned filter
    // -------------------------------------------------------------------------

    apiTest(
      'pinned=true returns only pinned conversations, pinned=false only unpinned',
      async ({ asAdmin }) => {
        // Pin the first two conversations via the internal endpoint.
        const toPinIds = conversationIds.slice(0, 2);
        for (const id of toPinIds) {
          const pinRes = await asAdmin.post(
            `${INTERNAL_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}/_set_pinned`,
            { body: { pinned: true }, responseType: 'json' }
          );
          expect(pinRes).toHaveStatusCode(200);
        }

        // pinned=true should return only the pinned ones.
        const pinnedRes = await asAdmin.get(
          `${CONVERSATIONS_PATH}?${new URLSearchParams({
            agent_id: agentId,
            pinned: 'true',
          })}`,
          { responseType: 'json' }
        );
        expect(pinnedRes).toHaveStatusCode(200);
        const pinnedBody = pinnedRes.body as ListConversationsResponse;
        expect(pinnedBody.results).toHaveLength(2);
        const pinnedIds = pinnedBody.results.map((c) => c.id);
        for (const id of toPinIds) {
          expect(pinnedIds).toContain(id);
        }

        // pinned=false should return only the unpinned ones.
        const unpinnedRes = await asAdmin.get(
          `${CONVERSATIONS_PATH}?${new URLSearchParams({
            agent_id: agentId,
            pinned: 'false',
          })}`,
          { responseType: 'json' }
        );
        expect(unpinnedRes).toHaveStatusCode(200);
        const unpinnedBody = unpinnedRes.body as ListConversationsResponse;
        expect(unpinnedBody.results).toHaveLength(5);
        for (const id of toPinIds) {
          expect(unpinnedBody.results.map((c) => c.id)).not.toContain(id);
        }

        // Unpin for test isolation.
        for (const id of toPinIds) {
          await asAdmin.post(
            `${INTERNAL_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}/_set_pinned`,
            { body: { pinned: false }, responseType: 'json' }
          );
        }
      }
    );

    apiTest(
      'omitting pinned returns all conversations (pinned and unpinned)',
      async ({ asAdmin }) => {
        // Pin one conversation for this test.
        const [idToPin] = conversationIds;
        const pinRes = await asAdmin.post(
          `${INTERNAL_AGENT_BUILDER}/conversations/${encodeURIComponent(idToPin)}/_set_pinned`,
          { body: { pinned: true }, responseType: 'json' }
        );
        expect(pinRes).toHaveStatusCode(200);

        // Without pinned filter, all 7 should be reachable across pages.
        const page1 = (
          await asAdmin.get(
            `${CONVERSATIONS_PATH}?${new URLSearchParams({
              agent_id: agentId,
              per_page: String(PER_PAGE),
              page: '1',
            })}`,
            { responseType: 'json' }
          )
        ).body as ListConversationsResponse;
        const page2 = (
          await asAdmin.get(
            `${CONVERSATIONS_PATH}?${new URLSearchParams({
              agent_id: agentId,
              per_page: String(PER_PAGE),
              page: '2',
            })}`,
            { responseType: 'json' }
          )
        ).body as ListConversationsResponse;

        const allIds = new Set([...page1.results, ...page2.results].map((c) => c.id));
        expect(allIds.has(idToPin)).toBe(true); // pinned conversation is included
        expect(allIds.size).toBe(7); // all 7 present

        // Unpin for test isolation.
        await asAdmin.post(
          `${INTERNAL_AGENT_BUILDER}/conversations/${encodeURIComponent(idToPin)}/_set_pinned`,
          { body: { pinned: false }, responseType: 'json' }
        );
      }
    );

    apiTest('a conversation with no pinned value is treated as unpinned', async ({ asAdmin }) => {
      // Create a conversation via the API (gets pinned:false by default), then
      // remove the `pinned` field directly in ES to simulate a document that
      // was written before the pinned feature was introduced (pre-Aug 2026).
      const createRes = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { agent_id: agentId, title: 'Legacy conversation without pinned field' },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const neverPinnedId = (createRes.body as CreateConversationResponse).id;

      await sysEsClient.update({
        index: CHAT_CONVERSATIONS_INDEX,
        id: neverPinnedId,
        refresh: 'wait_for',
        script: { source: "ctx._source.remove('pinned')", lang: 'painless' },
      });

      // pinned=false (unpinned) should include it.
      const unpinnedRes = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({
          agent_id: agentId,
          pinned: 'false',
        })}`,
        { responseType: 'json' }
      );
      expect(unpinnedRes).toHaveStatusCode(200);
      expect((unpinnedRes.body as ListConversationsResponse).results.map((c) => c.id)).toContain(
        neverPinnedId
      );

      // No pinned filter (all conversations) should also include it.
      const allRes = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({ agent_id: agentId })}`,
        { responseType: 'json' }
      );
      expect(allRes).toHaveStatusCode(200);
      expect((allRes.body as ListConversationsResponse).results.map((c) => c.id)).toContain(
        neverPinnedId
      );

      // pinned=true should NOT include it.
      const pinnedRes = await asAdmin.get(
        `${CONVERSATIONS_PATH}?${new URLSearchParams({
          agent_id: agentId,
          pinned: 'true',
        })}`,
        { responseType: 'json' }
      );
      expect(pinnedRes).toHaveStatusCode(200);
      expect((pinnedRes.body as ListConversationsResponse).results.map((c) => c.id)).not.toContain(
        neverPinnedId
      );

      // Clean up.
      await asAdmin.delete(`${CONVERSATIONS_PATH}/${encodeURIComponent(neverPinnedId)}`, {
        responseType: 'json',
      });
    });
  }
);
