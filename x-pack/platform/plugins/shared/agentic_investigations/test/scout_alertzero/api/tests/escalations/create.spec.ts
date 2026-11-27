/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  INTERNAL_HEADERS,
  PUBLIC_HEADERS,
  CREATE_ESCALATION_PATH,
  AB_CONVERSATIONS_PATH,
  INVESTIGATIONS_PATH,
  expectCreated,
  deleteConversations,
  seedInvestigation,
} from '../../fixtures';

const ESCALATION_TEMPLATE_ID = 'escalation';

/** Manages escalations but not investigations: base Read without the investigations sub-feature. */
const ESCALATIONS_ONLY_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        agenticInvestigations: ['minimal_read', 'escalations_all'],
        agentBuilder: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

apiTest.describe(
  'POST /internal/investigations/escalations — create escalation',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;
    let escalationsOnlyCookieHeader: Record<string, string>;
    let investigationId: string;
    let adminProfileUid: string;
    let viewerProfileUid: string;
    let viewerProbeId: string;
    // Tracks all conversations created during the suite so afterAll can clean them up.
    const createdIds: string[] = [];
    // Conversations owned by the escalations-only user; only their owner can delete them.
    const escalationsOnlyCreatedIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));
      ({ cookieHeader: escalationsOnlyCookieHeader } = await samlAuth.asInteractiveUser(
        ESCALATIONS_ONLY_ROLE
      ));

      // The viewer's profile uid comes from a probe conversation they own.
      const viewerProbe = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...viewerCookieHeader },
        body: {
          title: '__create-spec-probe__',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      viewerProbeId = expectCreated(viewerProbe, 'viewer probe');
      viewerProfileUid = viewerProbe.body.user?.id as string;
      if (!viewerProfileUid) {
        throw new Error('viewer profile uid not found in probe creation response');
      }

      // Create a real investigation conversation through the Agent Builder API so the
      // .chat-conversations index is managed by Kibana (direct esClient writes are
      // rejected on restricted indices). The response also carries user.id — the admin's
      // profile uid used as the default assignee in subsequent escalation create calls.
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
            workflow_execution_ids: ['wf-scout-test'],
          },
        },
        responseType: 'json',
      });
      investigationId = expectCreated(result, 'investigation');
      adminProfileUid = result.body.user?.id as string;
      if (!adminProfileUid) {
        throw new Error('admin profile uid not found in investigation creation response');
      }
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteConversations(apiClient, [investigationId, ...createdIds], cookieHeader);
      await deleteConversations(apiClient, [viewerProbeId], viewerCookieHeader);
      await deleteConversations(apiClient, escalationsOnlyCreatedIds, escalationsOnlyCookieHeader);
    });

    apiTest('creates a public escalation and returns 200', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
          assignees: [adminProfileUid],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.template_id).toBe(ESCALATION_TEMPLATE_ID);
      expect(response.body.title).toBe('Scout test investigation');
      // Verify the assignee was stored — a handler that silently drops the field would still return 200.
      expect(response.body.metadata?.assignees).toStrictEqual([adminProfileUid]);
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
            assignees: [adminProfileUid],
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
      'does NOT copy workflow_execution_ids — investigation-only field',
      async ({ apiClient }) => {
        const response = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
            assignees: [adminProfileUid],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.metadata?.workflow_execution_ids).toBeUndefined();
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
            assignees: [adminProfileUid],
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
            assignees: [adminProfileUid],
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
          assignees: [adminProfileUid],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.linked_investigations).toStrictEqual([investigationId]);
      if (response.body.id) createdIds.push(response.body.id);
    });

    apiTest('assigns the creator to the escalated investigation', async ({ apiClient }) => {
      const unassignedId = await seedInvestigation(apiClient, cookieHeader, {
        title: 'Scout unassigned investigation',
      });
      createdIds.push(unassignedId);

      // The escalation goes to the viewer, so only the creator (admin) may end up on the
      // investigation.
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: unassignedId,
          visibility: 'public',
          assignees: [viewerProfileUid],
        },
        responseType: 'json',
      });
      createdIds.push(expectCreated(response, 'escalation'));
      expect(response.body.metadata?.assignees).toStrictEqual([viewerProfileUid]);

      const investigations = await apiClient.get(
        `${INVESTIGATIONS_PATH}?id=${encodeURIComponent(unassignedId)}`,
        { headers: { ...INTERNAL_HEADERS, ...cookieHeader }, responseType: 'json' }
      );
      expect(investigations).toHaveStatusCode(200);
      const { assignees } = investigations.body.results[0].metadata;
      expect(assignees).toStrictEqual([adminProfileUid]);
      expect(assignees).not.toContain(viewerProfileUid);
    });

    apiTest('does not assign a creator who cannot manage investigations', async ({ apiClient }) => {
      const unassignedId = await seedInvestigation(apiClient, cookieHeader, {
        title: 'Scout investigation escalated without manage_investigations',
      });
      createdIds.push(unassignedId);

      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...escalationsOnlyCookieHeader },
        body: {
          linked_investigation_id: unassignedId,
          visibility: 'public',
          assignees: [adminProfileUid],
        },
        responseType: 'json',
      });
      escalationsOnlyCreatedIds.push(expectCreated(response, 'escalation'));

      const investigations = await apiClient.get(
        `${INVESTIGATIONS_PATH}?id=${encodeURIComponent(unassignedId)}`,
        { headers: { ...INTERNAL_HEADERS, ...cookieHeader }, responseType: 'json' }
      );
      expect(investigations).toHaveStatusCode(200);
      expect(investigations.body.results[0].metadata.assignees ?? []).toStrictEqual([]);
    });

    apiTest('returns 400 when assignees is empty', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
          assignees: [],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when assignees is missing', async ({ apiClient }) => {
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
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
            assignees: [adminProfileUid],
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
            assignees: [adminProfileUid],
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
          assignees: [adminProfileUid],
        },
        responseType: 'json',
      });

      // Access denial and not-found both surface as 404 (documented behaviour)
      expect(response).toHaveStatusCode(404);
    });
  }
);
