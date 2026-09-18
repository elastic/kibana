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
} from '../../fixtures';

const ESCALATION_TEMPLATE_ID = 'escalation';

apiTest.describe(
  'POST /internal/investigations/escalations — create escalation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;
    let investigationId: string;
    const createdEscalationIds: string[] = [];

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
            workflow_execution_id: 'wf-scout-test',
          },
        },
        responseType: 'json',
      });
      if (result.statusCode !== 200 || !result.body.id) {
        throw new Error(
          `Setup: failed to create investigation (status ${result.statusCode}): ${JSON.stringify(result.body)}`
        );
      }
      investigationId = result.body.id;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await Promise.allSettled(
        [investigationId, ...createdEscalationIds]
          .filter(Boolean)
          .map((id) =>
            apiClient
              .delete(AB_CONVERSATION_BY_ID_PATH(id), {
                headers: { ...PUBLIC_HEADERS, ...cookieHeader },
              })
              .catch(() => {})
          )
      );
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
      if (response.body.id) createdEscalationIds.push(response.body.id);
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
        if (response.body.id) createdEscalationIds.push(response.body.id);
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
        if (response.body.id) createdEscalationIds.push(response.body.id);
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
        if (response.body.id) createdEscalationIds.push(response.body.id);
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
      if (response.body.id) createdEscalationIds.push(response.body.id);
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
        const wrongId = seedResponse.body.id;

        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: wrongId,
            visibility: 'public',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);

        await apiClient
          .delete(AB_CONVERSATION_BY_ID_PATH(wrongId), {
            headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          })
          .catch(() => {});
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
