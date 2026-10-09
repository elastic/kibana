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
  CREATE_ESCALATION_PATH,
  ESCALATION_LINK_PATH,
  AB_CONVERSATIONS_PATH,
  expectCreated,
  deleteConversations,
} from '../../fixtures';

apiTest.describe(
  'POST /internal/investigations/escalations/{id}/_link — link investigation to escalation',
  { tag: [...tags.local.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;
    let adminProfileUid: string;
    let investigationId: string;
    let secondInvestigationId: string;
    let escalationId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Create two investigations through the Agent Builder API so the index is
      // managed by Kibana (direct esClient writes are rejected on restricted indices).
      // The first response also carries user.id — the admin's profile uid used as
      // the required assignee in the escalation create call below.
      const [inv1, inv2] = await Promise.all([
        apiClient.post(AB_CONVERSATIONS_PATH, {
          headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          body: {
            title: 'Scout link test investigation',
            template_id: 'investigation',
            access_control: { access_mode: 'public' },
            metadata: { status: 'open', severity: 'high' },
          },
          responseType: 'json',
        }),
        apiClient.post(AB_CONVERSATIONS_PATH, {
          headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          body: {
            title: 'Scout second investigation',
            template_id: 'investigation',
            access_control: { access_mode: 'public' },
            metadata: { status: 'open' },
          },
          responseType: 'json',
        }),
      ]);
      investigationId = expectCreated(inv1, 'first investigation');
      secondInvestigationId = expectCreated(inv2, 'second investigation');
      adminProfileUid = inv1.body.user?.id as string;
      if (!adminProfileUid) {
        throw new Error('admin profile uid not found in investigation creation response');
      }

      const createResponse = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
          assignees: [adminProfileUid],
        },
        responseType: 'json',
      });
      escalationId = expectCreated(createResponse, 'escalation');
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteConversations(
        apiClient,
        [investigationId, secondInvestigationId, escalationId],
        cookieHeader
      );
    });

    apiTest('appends a second linked investigation (does not replace)', async ({ apiClient }) => {
      const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { linked_investigations: [secondInvestigationId] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const { linked_investigations } = response.body.metadata;
      expect(linked_investigations).toContain(investigationId);
      expect(linked_investigations).toContain(secondInvestigationId);
    });

    apiTest(
      'deduplicates — appending the same id twice within one request produces no duplicate',
      async ({ apiClient }) => {
        const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { linked_investigations: [secondInvestigationId, secondInvestigationId] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { linked_investigations } = response.body.metadata;
        const count = linked_investigations.filter(
          (id: string) => id === secondInvestigationId
        ).length;
        expect(count).toBe(1);
      }
    );

    apiTest('returns 400 for an empty linked_investigations array', async ({ apiClient }) => {
      const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { linked_investigations: [] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for a missing linked_investigations field', async ({ apiClient }) => {
      const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 403 for a caller without the manage_escalations privilege',
      async ({ apiClient }) => {
        const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          body: { linked_investigations: [secondInvestigationId] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns 404 for a nonexistent escalation id', async ({ apiClient }) => {
      const response = await apiClient.post(ESCALATION_LINK_PATH('nonexistent-id-00000000'), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { linked_investigations: [investigationId] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest(
      'returns 404 when linked_investigations contains a nonexistent id',
      async ({ apiClient }) => {
        const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { linked_investigations: ['nonexistent-investigation-00000000'] },
          responseType: 'json',
        });

        // Access denial and not-found both surface as 404 (documented behaviour).
        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
