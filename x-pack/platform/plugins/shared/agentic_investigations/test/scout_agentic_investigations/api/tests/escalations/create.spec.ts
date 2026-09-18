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
  AB_CONVERSATIONS_PATH,
  AB_CONVERSATION_BY_ID_PATH,
  expectCreated,
  deleteConversations,
} from '../../fixtures';

const ESCALATION_TEMPLATE_ID = 'escalation';

apiTest.describe(
  'POST /internal/investigations/escalations — create escalation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;
    let investigationId: string;
    // Tracks all conversations created during the suite so afterAll can clean them up.
    const createdIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Create a real investigation conversation through the Agent Builder API so the
      // .chat-conversations index is managed by Kibana (direct esClient writes are
      // rejected on restricted indices).
      const result = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...cookieHeader },
        body: {
          title: 'Scout test investigation',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: {
            status: 'open',
            severity: 'high',
            summary: 'Suspicious PowerShell',
            close_reason: 'resolved', // Intentionally set; the escalation must NOT inherit it.
            workflow_execution_id: 'wf-scout-test',
          },
        },
        responseType: 'json',
      });
      investigationId = expectCreated(result, 'investigation');
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteConversations(apiClient, [investigationId, ...createdIds], cookieHeader);
    });

    apiTest('creates a public escalation and returns 200', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.template_id).toBe(ESCALATION_TEMPLATE_ID);
      expect(response.body.title).toBe('Scout test investigation');
      if (response.body.id) createdIds.push(response.body.id);
    });

    apiTest(
      'copies overlapping metadata from the investigation (severity, summary)',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { metadata } = response.body;
        expect(metadata.severity).toBe('high');
        expect(metadata.summary).toBe('Suspicious PowerShell');
        if (response.body.id) createdIds.push(response.body.id);
      }
    );

    apiTest(
      'does NOT copy workflow_execution_id — investigation-only field',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.metadata?.workflow_execution_id).toBeUndefined();
        if (response.body.id) createdIds.push(response.body.id);
      }
    );

    apiTest(
      'does NOT copy close_reason — escalation-lifecycle field, not inherited from investigation',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        // The investigation was seeded with close_reason: 'resolved'. A new escalation must
        // not inherit it — doing so would yield an open escalation with a stale close_reason.
        expect(response.body.metadata?.close_reason).toBeUndefined();
        if (response.body.id) createdIds.push(response.body.id);
      }
    );

    apiTest(
      'sets status to "open" regardless of the investigation status',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.metadata.status).toBe('open');
        if (response.body.id) createdIds.push(response.body.id);
      }
    );

    apiTest('sets linked_investigations to [linked_investigation_id]', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.linked_investigations).toStrictEqual([investigationId]);
      if (response.body.id) createdIds.push(response.body.id);
    });

    apiTest('returns 400 when public + collaborators is provided', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
          collaborators: ['u_someone'],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when private + no collaborators', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'private',
          collaborators: [],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 400 when linked_investigation_id points at a non-investigation',
      async ({ apiClient }) => {
        // Create a conversation with the escalation template (wrong template for this check).
        // Register in createdIds immediately so afterAll deletes it even if the assertions fail.
        const seedResponse = await apiClient.post(AB_CONVERSATIONS_PATH, {
          headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          body: {
            title: 'Wrong template',
            template_id: 'escalation',
            access_control: { access_mode: 'public' },
            metadata: { status: 'open' },
          },
          responseType: 'json',
        });
        const wrongId = expectCreated(seedResponse, 'wrong-template conversation');
        // Push before the assertion so it is cleaned up even when the assertion fails.
        createdIds.push(wrongId);

        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: wrongId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 403 for a caller without the manage_escalations privilege',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        // viewer has read on agenticInvestigations but not manage_escalations
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns 404 when linked_investigation_id does not exist', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: 'nonexistent-id-00000000',
          visibility: 'public',
        },
        responseType: 'json',
      });

      // Access denial and not-found both surface as 404 (documented behaviour)
      expect(response).toHaveStatusCode(404);
    });
  }
);
