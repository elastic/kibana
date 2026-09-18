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
  ESCALATION_BY_ID_PATH,
  AB_CONVERSATIONS_PATH,
  AB_CONVERSATION_BY_ID_PATH,
} from '../../fixtures';

apiTest.describe(
  'PATCH /internal/investigations/escalations/{id} — update escalation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;
    let investigationId: string;
    let secondInvestigationId: string;
    let escalationId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Create two investigations through the Agent Builder API so the index is
      // managed by Kibana (direct esClient writes are rejected on restricted indices).
      const [inv1, inv2] = await Promise.all([
        apiClient.post(AB_CONVERSATIONS_PATH, {
          headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          body: {
            title: 'Scout update test investigation',
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
      investigationId = inv1.body.id;
      secondInvestigationId = inv2.body.id;

      // Create the escalation to update
      const createResponse = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { linked_investigation_id: investigationId, visibility: 'public' },
        responseType: 'json',
      });
      if (createResponse.statusCode !== 200 || !createResponse.body.id) {
        throw new Error(
          `Setup: failed to create escalation (status ${
            createResponse.statusCode
          }): ${JSON.stringify(createResponse.body)}`
        );
      }
      escalationId = createResponse.body.id;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await Promise.allSettled(
        [investigationId, secondInvestigationId, escalationId].filter(Boolean).map((id) =>
          apiClient
            .delete(AB_CONVERSATION_BY_ID_PATH(id), {
              headers: { ...PUBLIC_HEADERS, ...cookieHeader },
            })
            .catch(() => {})
        )
      );
    });

    apiTest('renames the escalation and returns 200', async ({ apiClient }) => {
      const response = await apiClient.patch(ESCALATION_BY_ID_PATH(escalationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { title: 'Renamed by Scout test' },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.title).toBe('Renamed by Scout test');
    });

    apiTest('appends a second linked investigation (does not replace)', async ({ apiClient }) => {
      const response = await apiClient.patch(ESCALATION_BY_ID_PATH(escalationId), {
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
      'deduplicates — patching the same id twice produces no duplicate',
      async ({ apiClient }) => {
        // First append secondInvestigationId, then append it again and verify no duplicate.
        await apiClient.patch(ESCALATION_BY_ID_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { linked_investigations: [secondInvestigationId] },
          responseType: 'json',
        });

        const response = await apiClient.patch(ESCALATION_BY_ID_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { linked_investigations: [secondInvestigationId] },
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

    apiTest('returns 400 for an empty body', async ({ apiClient }) => {
      const response = await apiClient.patch(ESCALATION_BY_ID_PATH(escalationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an empty linked_investigations array', async ({ apiClient }) => {
      const response = await apiClient.patch(ESCALATION_BY_ID_PATH(escalationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { linked_investigations: [] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 403 for a caller without the manage_escalations privilege',
      async ({ apiClient }) => {
        const response = await apiClient.patch(ESCALATION_BY_ID_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          body: { title: 'Should not work' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns 404 for a nonexistent escalation id', async ({ apiClient }) => {
      const response = await apiClient.patch(ESCALATION_BY_ID_PATH('nonexistent-id-00000000'), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { title: 'Does not matter' },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });
  }
);
