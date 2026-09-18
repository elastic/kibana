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
  CREATE_ESCALATION_PATH,
  ESCALATION_BY_ID_PATH,
} from '../../fixtures';

const INVESTIGATION_INDEX = '.chat-conversations';
const INVESTIGATION_TEMPLATE_ID = 'investigation';

apiTest.describe(
  'PATCH /internal/investigations/escalations/{id} — update escalation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;
    let investigationId: string;
    let secondInvestigationId: string;
    let escalationId: string;

    apiTest.beforeAll(async ({ samlAuth, esClient, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Seed two investigations
      const [inv1, inv2] = await Promise.all([
        esClient.index({
          index: INVESTIGATION_INDEX,
          refresh: true,
          document: {
            template_id: INVESTIGATION_TEMPLATE_ID,
            title: 'Scout update test investigation',
            agent_id: 'elastic-ai-agent',
            space_id: 'default',
            '@timestamp': new Date().toISOString(),
            rounds: [],
            metadata: { status: 'open', severity: 'high' },
            access_control: { access_mode: 'public' },
          },
        }),
        esClient.index({
          index: INVESTIGATION_INDEX,
          refresh: true,
          document: {
            template_id: INVESTIGATION_TEMPLATE_ID,
            title: 'Scout second investigation',
            agent_id: 'elastic-ai-agent',
            space_id: 'default',
            '@timestamp': new Date().toISOString(),
            rounds: [],
            metadata: { status: 'open' },
            access_control: { access_mode: 'public' },
          },
        }),
      ]);
      investigationId = inv1._id;
      secondInvestigationId = inv2._id;

      // Create the escalation to update
      const createResponse = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { linked_investigation_id: investigationId, visibility: 'public' },
        responseType: 'json',
      });
      if (createResponse.status !== 200 || !createResponse.body.id) {
        throw new Error(
          `Setup: failed to create escalation (status ${createResponse.status}): ${JSON.stringify(
            createResponse.body
          )}`
        );
      }
      escalationId = createResponse.body.id;
    });

    apiTest.afterAll(async ({ esClient }) => {
      await Promise.allSettled([
        esClient.delete({ index: INVESTIGATION_INDEX, id: investigationId }),
        esClient.delete({ index: INVESTIGATION_INDEX, id: secondInvestigationId }),
        esClient.delete({ index: INVESTIGATION_INDEX, id: escalationId }),
      ]);
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
