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
  INVESTIGATION_ASSIGNEES_PATH,
  AB_CONVERSATIONS_PATH,
  AB_CONVERSATION_BY_ID_PATH,
} from '../../fixtures';

apiTest.describe(
  'PATCH /internal/investigations/{id}/assignees — update investigation assignees',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let investigationId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));

      // Create the investigation through the Agent Builder public API so the index
      // is managed by Kibana (direct ES writes are rejected on restricted indices).
      const createResponse = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: 'Scout assignees test investigation',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open', severity: 'high' },
        },
        responseType: 'json',
      });

      if (createResponse.statusCode !== 200 || !createResponse.body.id) {
        throw new Error(
          `Setup: failed to create investigation (status ${
            createResponse.statusCode
          }): ${JSON.stringify(createResponse.body)}`
        );
      }
      investigationId = createResponse.body.id;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      if (investigationId) {
        await apiClient
          .delete(AB_CONVERSATION_BY_ID_PATH(investigationId), {
            headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          })
          .catch(() => {});
      }
    });

    apiTest(
      'removes all assignees when given an empty array and returns 200',
      async ({ apiClient }) => {
        const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.assignees).toStrictEqual([]);
      }
    );

    apiTest('returns 404 when the conversation is not an investigation', async ({ apiClient }) => {
      const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH('not-an-inv-id'), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { assignees: [] },
        responseType: 'json',
      });

      // notFound from agent builder (conversation not found) or from our guard (wrong template)
      expect(response.statusCode).toBe(404);
    });

    apiTest('returns 400 when an assignee profile uid does not exist', async ({ apiClient }) => {
      const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { assignees: ['uid-does-not-exist-abc123'] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('"uid-does-not-exist-abc123"');
    });
  }
);
