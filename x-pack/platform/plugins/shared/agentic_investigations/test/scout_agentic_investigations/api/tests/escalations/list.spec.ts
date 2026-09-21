/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  INTERNAL_HEADERS,
  PUBLIC_HEADERS,
  LIST_ESCALATIONS_PATH,
  CREATE_ESCALATION_PATH,
  AB_CONVERSATIONS_PATH,
  expectCreated,
  deleteConversations,
} from '../../fixtures';

const ESCALATION_TEMPLATE_ID = 'escalation';

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
    // The investigation backing the open escalation.
    let openInvestigationId: string;
    // The investigation backing the private escalation.
    let privateInvestigationId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Investigation backing the open escalation.
      const invResult = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: 'Scout open escalation investigation',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open', severity: 'high' },
        },
        responseType: 'json',
      });
      openInvestigationId = expectCreated(invResult, 'open investigation');

      // Open escalation — must appear in the list.
      const openResult = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { linked_investigation_id: openInvestigationId, visibility: 'public' },
        responseType: 'json',
      });
      openEscalationId = expectCreated(openResult, 'open escalation');

      // Closed escalation — created directly via the Agent Builder API so we can set
      // status: "closed" at creation time. Must NOT appear in the list.
      const closedResult = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: 'Scout closed escalation',
          template_id: 'escalation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'closed' },
        },
        responseType: 'json',
      });
      closedEscalationId = expectCreated(closedResult, 'closed escalation');

      // Investigation (wrong template) — must NOT appear in the escalations list.
      const wrongTemplateResult = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: 'Scout investigation — should not appear in escalations list',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      investigationId = expectCreated(wrongTemplateResult, 'wrong-template investigation');

      // Investigation backing the private escalation.
      const privateInvResult = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: 'Scout private escalation investigation',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      privateInvestigationId = expectCreated(privateInvResult, 'private investigation');

      // Private escalation owned by admin with a collaborator that is neither admin nor
      // viewer. Viewer (not owner, not a listed collaborator) must NOT see it in the list.
      const privateResult = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: privateInvestigationId,
          visibility: 'private',
          collaborators: ['u_scout_fake_collaborator_not_viewer'],
        },
        responseType: 'json',
      });
      privateEscalationId = expectCreated(privateResult, 'private escalation');
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteConversations(
        apiClient,
        [
          openEscalationId,
          closedEscalationId,
          investigationId,
          privateEscalationId,
          openInvestigationId,
          privateInvestigationId,
        ],
        cookieHeader
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

    apiTest(
      'excludes private escalations the caller is not a collaborator of',
      async ({ apiClient }) => {
        // Viewer is not the owner and not listed as a collaborator of the private escalation.
        const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const ids = response.body.results.map((r: { id: string }) => r.id);
        expect(ids).not.toContain(privateEscalationId);
      }
    );

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

    apiTest('viewer (escalations_read) can list escalations', async ({ apiClient }) => {
      // Viewer holds escalations_read explicitly. They can list but not create or update.
      const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });

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
