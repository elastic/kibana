/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { MAX_CONVERSATION_SEARCH_PER_PAGE } from '../../../../common/constants';
import type {
  CreateConversationResponse,
  SearchConversationsResponse,
} from '../../../../common/http_api/conversations';
import {
  createAgentViaKbn,
  deleteAgentViaKbn,
} from '../../../scout_agent_builder_shared/lib/agents_kbn';
import { deleteAllConversationsFromEs } from '../../../scout_agent_builder_shared/lib/conversations_es';
import type { AuthedApiClient } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import { apiTest } from '../fixtures';
import {
  API_AGENT_BUILDER,
  CHAT_AGENTS_INDEX,
  CHAT_CONVERSATIONS_INDEX,
  INTERNAL_AGENT_BUILDER,
} from '../fixtures/constants';

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;
const SEARCH_PATH = `${INTERNAL_AGENT_BUILDER}/conversations/_search`;
const WIDGET_COUNT = 7;
const WIDGET_PER_PAGE = 5;

apiTest.describe(
  'Agent Builder — conversations search API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const agentId = 'search-test-agent';
    const otherAgentId = 'search-test-agent-other';

    let q3SalesReportId: string;
    let salesPipelineId: string;
    let marketingPlanId: string;
    let airportId: string;
    let widgetIds: string[] = [];
    let otherAgentConversationId: string;

    const createConversation = async (
      asAdmin: AuthedApiClient,
      title: string,
      forAgentId: string = agentId
    ): Promise<string> => {
      const res = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { agent_id: forAgentId, title },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      return (res.body as CreateConversationResponse).id;
    };

    apiTest.beforeAll(async ({ kbnClient, asAdmin, esClient }) => {
      // Fixture creation is independent per-agent/per-conversation, so it is parallelized —
      // this environment's per-request latency made the prior sequential version exceed the
      // default 60s beforeAll timeout well before all ~14 fixture requests had completed.
      await Promise.all([
        createAgentViaKbn(kbnClient, { id: agentId, name: 'Search Test Agent' }),
        createAgentViaKbn(kbnClient, { id: otherAgentId, name: 'Search Test Agent (other)' }),
      ]);

      // Conversation creation resolves agent_id against the agents index; without an explicit
      // refresh here, creating a conversation immediately after the agent races the index refresh.
      await esClient.indices.refresh({ index: CHAT_AGENTS_INDEX, ignore_unavailable: true });

      const widgetTitles = Array.from({ length: WIDGET_COUNT }, (_, i) => `Widget update ${i + 1}`);
      const [
        q3SalesReport,
        salesPipeline,
        marketingPlan,
        airport,
        widgets,
        otherAgentConversation,
      ] = await Promise.all([
        createConversation(asAdmin, 'Q3 Sales Report'),
        createConversation(asAdmin, 'Sales pipeline review'),
        createConversation(asAdmin, 'Marketing plan'),
        createConversation(asAdmin, 'Airport transfer notes'),
        Promise.all(widgetTitles.map((title) => createConversation(asAdmin, title))),
        createConversation(asAdmin, 'Sales report other agent', otherAgentId),
      ]);
      q3SalesReportId = q3SalesReport;
      salesPipelineId = salesPipeline;
      marketingPlanId = marketingPlan;
      airportId = airport;
      widgetIds = widgets;
      otherAgentConversationId = otherAgentConversation;

      // Search is far more refresh-sensitive than offset pagination over recency —
      // make every fixture conversation visible before the first assertion runs.
      await esClient.indices.refresh({ index: CHAT_CONVERSATIONS_INDEX, ignore_unavailable: true });
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      await deleteAgentViaKbn(kbnClient, agentId);
      await deleteAgentViaKbn(kbnClient, otherAgentId);
      await deleteAllConversationsFromEs(esClient);
    });

    const search = (asAdmin: AuthedApiClient, params: Record<string, string>) =>
      asAdmin.get(`${SEARCH_PATH}?${new URLSearchParams(params)}`, { responseType: 'json' });

    // -------------------------------------------------------------------------
    // title matching semantics
    // -------------------------------------------------------------------------

    apiTest(
      'a single-token query matches only titles containing that word',
      async ({ asAdmin }) => {
        const res = await search(asAdmin, { query: 'Report', agent_id: agentId });

        expect(res).toHaveStatusCode(200);
        const ids = (res.body as SearchConversationsResponse).results.map((c) => c.id);
        expect(ids).toContain(q3SalesReportId);
        expect(ids).not.toContain(salesPipelineId);
        expect(ids).not.toContain(marketingPlanId);
        expect(ids).not.toContain(airportId);
      }
    );

    apiTest(
      'a multi-token query requires every token to match (AND), not just any of them',
      async ({ asAdmin }) => {
        const res = await search(asAdmin, { query: 'sales report', agent_id: agentId });

        expect(res).toHaveStatusCode(200);
        const ids = (res.body as SearchConversationsResponse).results.map((c) => c.id);
        expect(ids).toContain(q3SalesReportId);
        // "Sales pipeline review" has "sales" but no term starting with "report".
        expect(ids).not.toContain(salesPipelineId);
      }
    );

    apiTest('the last token matches as a prefix', async ({ asAdmin }) => {
      const res = await search(asAdmin, { query: 'sales rep', agent_id: agentId });

      expect(res).toHaveStatusCode(200);
      const ids = (res.body as SearchConversationsResponse).results.map((c) => c.id);
      expect(ids).toContain(q3SalesReportId);
      // "review" does not start with "rep".
      expect(ids).not.toContain(salesPipelineId);
    });

    apiTest('matching is case-insensitive', async ({ asAdmin }) => {
      const res = await search(asAdmin, { query: 'REPORT', agent_id: agentId });

      expect(res).toHaveStatusCode(200);
      const ids = (res.body as SearchConversationsResponse).results.map((c) => c.id);
      expect(ids).toContain(q3SalesReportId);
    });

    apiTest('does not match mid-word: "port" does not match "Airport"', async ({ asAdmin }) => {
      const res = await search(asAdmin, { query: 'port', agent_id: agentId });

      expect(res).toHaveStatusCode(200);
      const ids = (res.body as SearchConversationsResponse).results.map((c) => c.id);
      expect(ids).not.toContain(airportId);
    });

    // -------------------------------------------------------------------------
    // agent scoping
    // -------------------------------------------------------------------------

    apiTest('agent_id scopes results to that agent only', async ({ asAdmin }) => {
      const res = await search(asAdmin, { query: 'sales', agent_id: agentId });

      expect(res).toHaveStatusCode(200);
      const ids = (res.body as SearchConversationsResponse).results.map((c) => c.id);
      expect(ids).toContain(q3SalesReportId);
      expect(ids).toContain(salesPipelineId);
      expect(ids).not.toContain(otherAgentConversationId);
    });

    apiTest(
      "a different agent_id excludes the first agent's matching conversations",
      async ({ asAdmin }) => {
        const res = await search(asAdmin, { query: 'sales', agent_id: otherAgentId });

        expect(res).toHaveStatusCode(200);
        const ids = (res.body as SearchConversationsResponse).results.map((c) => c.id);
        expect(ids).toContain(otherAgentConversationId);
        expect(ids).not.toContain(q3SalesReportId);
        expect(ids).not.toContain(salesPipelineId);
      }
    );

    // -------------------------------------------------------------------------
    // pagination
    // -------------------------------------------------------------------------

    apiTest(
      'pages are non-overlapping and together cover all matches, with a correct pagination envelope',
      async ({ asAdmin }) => {
        const page1Res = await search(asAdmin, {
          query: 'widget',
          agent_id: agentId,
          per_page: String(WIDGET_PER_PAGE),
          page: '1',
        });
        const page2Res = await search(asAdmin, {
          query: 'widget',
          agent_id: agentId,
          per_page: String(WIDGET_PER_PAGE),
          page: '2',
        });

        expect(page1Res).toHaveStatusCode(200);
        expect(page2Res).toHaveStatusCode(200);

        const page1 = page1Res.body as SearchConversationsResponse;
        const page2 = page2Res.body as SearchConversationsResponse;

        expect(page1.pagination.total).toBe(WIDGET_COUNT);
        expect(page1.pagination.page).toBe(1);
        expect(page1.pagination.per_page).toBe(WIDGET_PER_PAGE);
        expect(page2.pagination.total).toBe(WIDGET_COUNT);
        expect(page2.pagination.page).toBe(2);
        expect(page2.pagination.per_page).toBe(WIDGET_PER_PAGE);
        expect(page1.results).toHaveLength(WIDGET_PER_PAGE);
        expect(page2.results).toHaveLength(WIDGET_COUNT - WIDGET_PER_PAGE);

        const page1Ids = new Set(page1.results.map((c) => c.id));
        const page2Ids = new Set(page2.results.map((c) => c.id));
        for (const id of page2Ids) {
          expect(page1Ids.has(id)).toBe(false);
        }

        const allIds = new Set([...page1Ids, ...page2Ids]);
        for (const id of widgetIds) {
          expect(allIds.has(id)).toBe(true);
        }
      }
    );

    // -------------------------------------------------------------------------
    // validation
    // -------------------------------------------------------------------------

    apiTest('missing query returns 400', async ({ asAdmin }) => {
      const res = await search(asAdmin, { agent_id: agentId });
      expect(res).toHaveStatusCode(400);
    });

    apiTest('empty query returns 400', async ({ asAdmin }) => {
      const res = await search(asAdmin, { query: '', agent_id: agentId });
      expect(res).toHaveStatusCode(400);
    });

    apiTest('per_page exceeding the search maximum returns 400', async ({ asAdmin }) => {
      const res = await search(asAdmin, {
        query: 'widget',
        per_page: String(MAX_CONVERSATION_SEARCH_PER_PAGE + 1),
      });
      expect(res).toHaveStatusCode(400);
    });

    apiTest('page * per_page exceeding MAX_RESULT_WINDOW returns 400', async ({ asAdmin }) => {
      // MAX_RESULT_WINDOW = 10_000; page=201 * per_page=50 (the search maximum) = 10_050 > 10_000.
      const res = await search(asAdmin, { query: 'widget', per_page: '50', page: '201' });
      expect(res).toHaveStatusCode(400);
    });
  }
);
