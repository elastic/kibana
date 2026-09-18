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
  INVESTIGATION_CLOSE_PATH,
  AB_CONVERSATIONS_PATH,
  AB_CONVERSATION_BY_ID_PATH,
} from '../../fixtures';

apiTest.describe(
  'POST /internal/investigations/{id}/close — close investigation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let investigationId: string;

    apiTest.beforeEach(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));

      const createResponse = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: 'Scout close test investigation',
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

    apiTest.afterEach(async ({ apiClient }) => {
      if (investigationId) {
        await apiClient
          .delete(AB_CONVERSATION_BY_ID_PATH(investigationId), {
            headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          })
          .catch(() => {});
      }
    });

    apiTest('closes the investigation and returns 200', async ({ apiClient }) => {
      const response = await apiClient.post(INVESTIGATION_CLOSE_PATH(investigationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { closeReason: 'resolved' },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.status).toBe('closed');
      expect(typeof response.body.declinedProposalCount).toBe('number');
      expect(typeof response.body.workflowCancelled).toBe('boolean');
    });

    apiTest('returns 404 when the conversation is not an investigation', async ({ apiClient }) => {
      const response = await apiClient.post(INVESTIGATION_CLOSE_PATH('not-an-inv-id'), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { closeReason: 'resolved' },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(404);
    });

    apiTest('returns 400 for an invalid close reason', async ({ apiClient }) => {
      const response = await apiClient.post(INVESTIGATION_CLOSE_PATH(investigationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { closeReason: 'not_a_valid_reason' },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(400);
    });
  }
);
