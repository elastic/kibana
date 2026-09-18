/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, INTERNAL_HEADERS, LIST_ESCALATIONS_PATH } from '../../fixtures';

const ESCALATION_TEMPLATE_ID = 'escalation';
const INVESTIGATION_TEMPLATE_ID = 'investigation';
const INVESTIGATION_INDEX = '.chat-conversations';

apiTest.describe(
  'GET /internal/investigations/escalations — list escalations',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;

    // Ids seeded in beforeAll, cleaned up in afterAll.
    let openEscalationId: string;
    let closedEscalationId: string;
    let investigationId: string;
    let privateEscalationId: string;

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Open escalation — must appear in the list.
      const openResult = await esClient.index({
        index: INVESTIGATION_INDEX,
        refresh: true,
        document: {
          template_id: ESCALATION_TEMPLATE_ID,
          title: 'Scout open escalation',
          agent_id: 'elastic-ai-agent',
          space_id: 'default',
          '@timestamp': new Date().toISOString(),
          rounds: [],
          metadata: { status: 'open', severity: 'high' },
          access_control: { access_mode: 'public' },
        },
      });
      openEscalationId = openResult._id;

      // Closed escalation — must NOT appear in the list.
      const closedResult = await esClient.index({
        index: INVESTIGATION_INDEX,
        refresh: true,
        document: {
          template_id: ESCALATION_TEMPLATE_ID,
          title: 'Scout closed escalation',
          agent_id: 'elastic-ai-agent',
          space_id: 'default',
          '@timestamp': new Date().toISOString(),
          rounds: [],
          metadata: { status: 'closed' },
          access_control: { access_mode: 'public' },
        },
      });
      closedEscalationId = closedResult._id;

      // Investigation (wrong template) — must NOT appear in the list.
      const invResult = await esClient.index({
        index: INVESTIGATION_INDEX,
        refresh: true,
        document: {
          template_id: INVESTIGATION_TEMPLATE_ID,
          title: 'Scout investigation — should not appear',
          agent_id: 'elastic-ai-agent',
          space_id: 'default',
          '@timestamp': new Date().toISOString(),
          rounds: [],
          metadata: { status: 'open' },
          access_control: { access_mode: 'public' },
        },
      });
      investigationId = invResult._id;

      // Private escalation with no access_control entries for the test users — must
      // NOT appear in the list for admin (who is not the owner or a listed member).
      // Seeded as owned by a fictional user id so neither admin nor viewer match.
      const privateResult = await esClient.index({
        index: INVESTIGATION_INDEX,
        refresh: true,
        document: {
          template_id: ESCALATION_TEMPLATE_ID,
          title: 'Scout private escalation — no access',
          agent_id: 'elastic-ai-agent',
          space_id: 'default',
          user_id: 'u_some_other_user_that_is_not_admin',
          '@timestamp': new Date().toISOString(),
          rounds: [],
          metadata: { status: 'open' },
          access_control: { access_mode: 'private', entries: [] },
        },
      });
      privateEscalationId = privateResult._id;
    });

    apiTest.afterAll(async ({ esClient }) => {
      await Promise.all(
        [openEscalationId, closedEscalationId, investigationId, privateEscalationId]
          .filter(Boolean)
          .map((id) => esClient.delete({ index: INVESTIGATION_INDEX, id }).catch(() => {}))
      );
    });

    apiTest('returns 200 with a pagination envelope and results array', async ({ apiClient }) => {
      const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(typeof response.body.pagination.total).toBe('number');
      expect(typeof response.body.pagination.page).toBe('number');
      expect(typeof response.body.pagination.per_page).toBe('number');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    apiTest('includes the open escalation in results', async ({ apiClient }) => {
      const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const ids = response.body.results.map((r: { id: string }) => r.id);
      expect(ids).toContain(openEscalationId);
    });

    apiTest('excludes the closed escalation from results', async ({ apiClient }) => {
      const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const ids = response.body.results.map((r: { id: string }) => r.id);
      expect(ids).not.toContain(closedEscalationId);
    });

    apiTest('excludes investigations (wrong template) from results', async ({ apiClient }) => {
      const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const ids = response.body.results.map((r: { id: string }) => r.id);
      expect(ids).not.toContain(investigationId);
    });

    apiTest('excludes private escalations the caller has no access to', async ({ apiClient }) => {
      const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const ids = response.body.results.map((r: { id: string }) => r.id);
      expect(ids).not.toContain(privateEscalationId);
    });

    apiTest(
      'results carry template_id: "escalation" (never "investigation")',
      async ({ apiClient }) => {
        const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        for (const result of response.body.results) {
          expect(result.template_id).toBe(ESCALATION_TEMPLATE_ID);
        }
      }
    );

    apiTest('echoes page and per_page in the pagination envelope', async ({ apiClient }) => {
      const response = await apiClient.get(`${LIST_ESCALATIONS_PATH}?page=1&per_page=5`, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.per_page).toBe(5);
    });

    apiTest(
      'viewer (escalations_read via includeIn: read) can list escalations',
      async ({ apiClient }) => {
        // With the mutually_exclusive sub-feature, viewer holds escalations_read.
        // They should be able to list but not create or update.
        const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest('returns 400 when per_page is 0', async ({ apiClient }) => {
      const response = await apiClient.get(`${LIST_ESCALATIONS_PATH}?page=1&per_page=0`, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 400 when page * per_page exceeds the result window (10 000)',
      async ({ apiClient }) => {
        // page=201, per_page=50 → 201 * 50 = 10 050 > 10 000
        const response = await apiClient.get(`${LIST_ESCALATIONS_PATH}?page=201&per_page=50`, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
      }
    );
  }
);
