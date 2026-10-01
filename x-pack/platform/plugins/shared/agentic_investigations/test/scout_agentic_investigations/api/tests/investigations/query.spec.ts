/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  AB_CONVERSATIONS_PATH,
  INTERNAL_HEADERS,
  INVESTIGATION_BY_ID_PATH,
  INVESTIGATIONS_PATH,
  INVESTIGATIONS_SEVERITY_COUNTS_PATH,
  PUBLIC_HEADERS,
  cleanupSubjects,
  deleteConversations,
  expectCreated,
  seedInvestigation,
  seedSubject,
} from '../../fixtures';

interface InvestigationSummaryBody {
  id: string;
  title: string;
  metadata: { status: string; severity?: string; summary?: string };
  in_progress: boolean;
  subjects: Array<{ type: string; id: string; summary?: string }>;
  impact?: { entities: Array<{ id: string; name?: string }> };
}

interface ListBody {
  results: InvestigationSummaryBody[];
  pagination: { total: number; page: number; per_page: number };
}

// Unique per run so other suites' investigations never match the filters.
const RUN = `scout-query-${Date.now()}`;

apiTest.describe(
  'GET /internal/investigations/investigations — investigation query API',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let highId: string;
    let lowId: string;
    let closedId: string;
    let escalationId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient, esClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));

      highId = await seedInvestigation(apiClient, cookieHeader, {
        title: `${RUN} checkout latency`,
        metadata: { status: 'open', severity: 'high', summary: `${RUN} checkout is slow` },
        impactEntities: [{ id: `${RUN}-checkout`, name: `${RUN}-checkout-service` }],
      });
      lowId = await seedInvestigation(apiClient, cookieHeader, {
        title: `${RUN} cart errors`,
        metadata: { status: 'open', severity: 'low', summary: `${RUN} cart errors` },
        impactEntities: [{ id: `${RUN}-cart` }],
      });
      closedId = await seedInvestigation(apiClient, cookieHeader, {
        title: `${RUN} closed`,
        metadata: { status: 'closed', severity: 'critical', summary: `${RUN} resolved` },
        impactEntities: [{ id: `${RUN}-checkout` }],
      });

      // Subjects have no HTTP write route; seed them into the index (see `subject_index.ts`).
      await seedSubject(esClient, {
        conversationId: highId,
        type: 'alert',
        id: `${RUN}-alert-1`,
        summary: 'High latency',
      });
      await seedSubject(esClient, {
        conversationId: highId,
        type: 'manual',
        id: `${RUN}-question-1`,
        summary: 'Why is checkout slow?',
      });
      await seedSubject(esClient, { conversationId: lowId, type: 'alert', id: `${RUN}-alert-2` });
      await seedSubject(esClient, {
        conversationId: closedId,
        type: 'alert',
        id: `${RUN}-alert-1`,
      });

      const escalation = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: `${RUN} escalation`,
          template_id: 'escalation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      escalationId = expectCreated(escalation, 'escalation');
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await cleanupSubjects(esClient, [highId, lowId, closedId]);
      await deleteConversations(apiClient, [highId, lowId, closedId, escalationId], cookieHeader);
    });

    const list = async (apiClient: ApiClientFixture, query: string) =>
      apiClient.get(`${INVESTIGATIONS_PATH}?${query}`, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

    apiTest('GET by id joins metadata, subjects, and impact', async ({ apiClient }) => {
      const response = await apiClient.get(INVESTIGATION_BY_ID_PATH(highId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: highId,
        title: `${RUN} checkout latency`,
        metadata: { status: 'open', severity: 'high', summary: `${RUN} checkout is slow` },
        in_progress: false,
        proposals: [],
        impact: {
          entities: [{ id: `${RUN}-checkout`, name: `${RUN}-checkout-service` }],
        },
      });
      expect(
        (response.body as InvestigationSummaryBody).subjects.map(({ type, id }) => `${type}:${id}`)
      ).toStrictEqual([`alert:${RUN}-alert-1`, `manual:${RUN}-question-1`]);
    });

    apiTest(
      'GET by id returns 404 for a conversation that is not an investigation',
      async ({ apiClient }) => {
        const response = await apiClient.get(INVESTIGATION_BY_ID_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('GET by id returns 404 for an unknown id', async ({ apiClient }) => {
      const response = await apiClient.get(INVESTIGATION_BY_ID_PATH(`${RUN}-missing`), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('filters by subject id, open and closed alike', async ({ apiClient }) => {
      const response = await list(apiClient, `subject_id=${RUN}-alert-1`);

      expect(response).toHaveStatusCode(200);
      const ids = (response.body as ListBody).results.map(({ id }) => id);
      expect(ids.sort()).toStrictEqual([highId, closedId].sort());
    });

    apiTest('finds the open investigation holding a subject', async ({ apiClient }) => {
      const response = await list(
        apiClient,
        `subject_type=alert&subject_id=${RUN}-alert-1&status=open&sort_field=updated_at`
      );

      expect(response).toHaveStatusCode(200);
      expect((response.body as ListBody).results.map(({ id }) => id)).toStrictEqual([highId]);
    });

    apiTest('filters by subject type and id together', async ({ apiClient }) => {
      const response = await list(
        apiClient,
        `subject_type=manual&subject_id=${RUN}-question-1&subject_id=${RUN}-alert-2`
      );

      expect(response).toHaveStatusCode(200);
      expect((response.body as ListBody).results.map(({ id }) => id)).toStrictEqual([highId]);
    });

    apiTest('intersects subject and entity filters', async ({ apiClient }) => {
      const response = await list(
        apiClient,
        `subject_id=${RUN}-alert-1&subject_id=${RUN}-alert-2&entity=${RUN}-cart`
      );

      expect(response).toHaveStatusCode(200);
      expect((response.body as ListBody).results.map(({ id }) => id)).toStrictEqual([lowId]);
    });

    apiTest('filters by impacted entity, open and closed alike', async ({ apiClient }) => {
      const response = await list(apiClient, `entity=${RUN}-checkout`);

      expect(response).toHaveStatusCode(200);
      const ids = (response.body as ListBody).results.map(({ id }) => id);
      expect(ids.sort()).toStrictEqual([highId, closedId].sort());
    });

    apiTest('filters by impacted entity and status together', async ({ apiClient }) => {
      const response = await list(apiClient, `entity=${RUN}-checkout&status=open`);

      expect(response).toHaveStatusCode(200);
      expect((response.body as ListBody).results.map(({ id }) => id)).toStrictEqual([highId]);
    });

    apiTest('filters by impacted entity id or name', async ({ apiClient }) => {
      const byId = await list(apiClient, `entity=${RUN}-cart`);
      expect(byId).toHaveStatusCode(200);
      expect((byId.body as ListBody).results.map(({ id }) => id)).toStrictEqual([lowId]);

      const byName = await list(apiClient, `entity=${RUN}-checkout-service`);
      expect(byName).toHaveStatusCode(200);
      expect((byName.body as ListBody).results.map(({ id }) => id)).toStrictEqual([highId]);
    });

    apiTest('filters by severity and free text, sorted by severity', async ({ apiClient }) => {
      const response = await list(
        apiClient,
        `query=${RUN}&severity=low&severity=critical&sort_field=severity&sort_order=desc`
      );

      expect(response).toHaveStatusCode(200);
      expect((response.body as ListBody).results.map(({ id }) => id)).toStrictEqual([
        closedId,
        lowId,
      ]);
    });

    apiTest(
      'in_progress=false includes idle investigations; true excludes them',
      async ({ apiClient }) => {
        const idle = await list(apiClient, `query=${RUN}&in_progress=false`);
        expect(idle).toHaveStatusCode(200);
        expect((idle.body as ListBody).results.map(({ id }) => id).sort()).toStrictEqual(
          [highId, lowId, closedId].sort()
        );
        expect((idle.body as ListBody).results.every(({ in_progress: busy }) => !busy)).toBe(true);

        const busy = await list(apiClient, `query=${RUN}&in_progress=true`);
        expect(busy).toHaveStatusCode(200);
        expect((busy.body as ListBody).results).toStrictEqual([]);
      }
    );

    apiTest('pages a filtered list and reports the total', async ({ apiClient }) => {
      const first = await list(apiClient, `query=${RUN}&per_page=2&page=1&sort_field=created_at`);
      const second = await list(apiClient, `query=${RUN}&per_page=2&page=2&sort_field=created_at`);

      expect(first).toHaveStatusCode(200);
      expect(second).toHaveStatusCode(200);
      const firstBody = first.body as ListBody;
      const secondBody = second.body as ListBody;
      expect(firstBody.pagination).toStrictEqual({ total: 3, page: 1, per_page: 2 });
      expect(firstBody.results).toHaveLength(2);
      expect(secondBody.results).toHaveLength(1);
      const all = [...firstBody.results, ...secondBody.results].map(({ id }) => id);
      expect(new Set(all).size).toBe(3);
      // Newest first by default.
      expect(firstBody.results[0].id).toBe(closedId);
    });

    apiTest('never returns conversations on another template', async ({ apiClient }) => {
      const response = await list(apiClient, `query=${RUN}&per_page=100`);

      expect(response).toHaveStatusCode(200);
      expect((response.body as ListBody).results.map(({ id }) => id)).not.toContain(escalationId);
    });

    apiTest('counts the filtered investigations per severity', async ({ apiClient }) => {
      const response = await apiClient.get(`${INVESTIGATIONS_SEVERITY_COUNTS_PATH}?query=${RUN}`, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ low: 1, medium: 0, high: 1, critical: 1 });
    });

    apiTest('returns 400 for an out-of-range page size', async ({ apiClient }) => {
      const response = await list(apiClient, 'per_page=101');

      expect(response).toHaveStatusCode(400);
    });
  }
);
